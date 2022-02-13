import { exit } from "process";
import { createInterface } from "readline";
import { createConnection, getRepository, SimpleConsoleLogger } from "typeorm";
import { danger } from "../../app/utils/discord";
import {
	WithdrawRequest,
	WithdrawStatus,
} from "../../database/entity/WithdrawRequest";
import { LedgerSigner } from "../../app/utils/ledger";
import { ethers, providers } from "ethers";
import { getConfig } from "../../app/utils/config";
import jpycV1Abi from "../../abis/JPYCV1Abi";
import { User } from "../../database/entity/User";

const main = async () => {
	console.info("--- Welcome to tipJPYC Withdraw Signer! ---");

	try {
		console.info("-> Try connection database...");
		await createConnection();
	} catch (err) {
		console.error("Database Connection Error!");
		await danger("Database Connection ERROR!", err);
		exit();
	}

	const networkType = getConfig("NETWORK_TYPE");
	const contractAddress = getConfig("JPYC_CONTRACT_ADDRESS");

	let provider: ethers.providers.AlchemyProvider;
	let signer: LedgerSigner;

	try {
		provider = new ethers.providers.AlchemyProvider(
			networkType,
			getConfig("ALCHEMY_API_KEY")
		);
		signer = new LedgerSigner(provider, "hid");
	} catch (err) {
		console.log(err);
		console.error("Provider or Signer Error!");
		await danger("Provider or Signer Connection ERROR!", String(err));
		exit();
	}

	const jpycV1Contract = new ethers.Contract(
		contractAddress,
		jpycV1Abi,
		signer
	);

	console.info("------------------");
	console.log("> Cheking deposit address balance");
	// Todo : クエリーのやり方あってますか？
	const users = await getRepository(User)
		.createQueryBuilder("user")
		.select(["user.id", "user.address"])
		.getMany();

	let targetUsers = [];
	for (let i = 0; i < users.length; i++) {
		const userBalance = await jpycV1Contract.balanceOf(users[i].address);
		if (Number(ethers.utils.formatUnits(userBalance, 18)) >= 50) {
			targetUsers.push(users[i]);
		}
	}

	if (!targetUsers.length) {
		console.info("> 回収できるJPYCはありません");
		exit();
	}

	console.info("------------------");
	console.log(`-> ${targetUsers.length}つの入金アドレスからJPYCを回収します`);

	for (let i = 0; i < targetUsers.length; i++) {
		const adminPath = "m/44'/60'/0'/1";
		const adminAddress = await signer.getAddress(adminPath);

		const path = `m/44'/60'/1'/${targetUsers[i]}`;

		const chainId = 4; // todo:環境変数にする？
		const userNativeTokenBalance = await provider.getBalance(
			targetUsers[i].address
		);

		let tx: ethers.providers.TransactionRequest;
		let signedTx: string;
		let sendTx: ethers.providers.TransactionResponse;

		if (userNativeTokenBalance.isZero()) {
			console.log(`>ガス代用のネイティブトークンを送金します`);

			tx = {
				chainId: chainId,
				to: targetUsers[i].address,
				value: ethers.utils.parseEther("0.001"),
				data: "",
				gasPrice: "0x218711a00",
				gasLimit: "0x5208",
			};

			signedTx = await signer.signTransaction(tx, path);
			sendTx = await provider.sendTransaction(signedTx);

			console.log(`
				-> https://${networkType}.etherscan.io/tx/${sendTx.hash}
			`);
			await sendTx.wait(3);
			console.log(`>ガス代用のネイティブトークンの送金完了`);
		}

		const allowance = await jpycV1Contract.allowance(
			targetUsers[i].address,
			adminAddress
		);

		let iface: ethers.utils.Interface = new ethers.utils.Interface([
			"function approve(address spender, uint256 amount)",
			"function transferFrom(address sender, address recipient, uint256 amount)",
		]);
		let functionData: string;

		if (allowance.isZero()) {
			console.log(">利用者のJPYCを管理者にAPPROVEします");

			functionData = iface.encodeFunctionData("approve", [
				adminAddress,
				"100000000000000000000000000000000000000000000",
			]);
			//Todo: approveする額の決定

			tx = {
				chainId: chainId,
				from: targetUsers[i].address,
				to: contractAddress,
				value: "",
				data: functionData,
				gasPrice: ethers.utils.parseUnits("1.1", "gwei"),
				gasLimit: 500000, //Todo: gaslimitの適正値は要調査
			};

			signedTx = await signer.signTransaction(tx, path);
			sendTx = await provider.sendTransaction(signedTx);

			console.log(
				`-> https://${networkType}.etherscan.io/tx/${sendTx.hash}`
			);
			await sendTx.wait(3);
			console.log(">APPROVE完了");
		}

		const balance = await jpycV1Contract.balanceOf(targetUsers[i].address);

		console.info(
			`> ${balance}JPYCをUserId ${targetUsers[i]}(${targetUsers[i].address})から${adminAddress}に送金します`
		);

		functionData = iface.encodeFunctionData("transferFrom", [
			targetUsers[i].address,
			adminAddress,
			balance,
		]);

		tx = {
			chainId: chainId,
			from: targetUsers[i].address,
			to: contractAddress,
			value: "",
			data: functionData,
			gasPrice: ethers.utils.parseUnits("1.1", "gwei"),
			gasLimit: 500000, //Todo: gaslimitの適正値は要調査
		};

		signedTx = await signer.signTransaction(tx, path);
		sendTx = await provider.sendTransaction(signedTx);

		console.log(`-> https://${networkType}.etherscan.io/tx/${sendTx.hash}`);
		await sendTx.wait(3);
		console.log(">JPYCの送金完了");
	}
};

const confirm = async (message: string, withdrawRequest: WithdrawRequest) => {
	const answer = await (await question(`> ${message} (y/n/e): `))
		.trim()
		.toLowerCase();

	if (answer !== "y" && answer !== "n") {
		console.info("------------------");
		console.info("> 終了処理を行います");

		withdrawRequest.status = WithdrawStatus.UNBUSY;
		await withdrawRequest.save();

		console.info("> 終了処理が完了しました");
		exit();
	}

	return answer === "y";
};

const question = (question: string): Promise<string> => {
	const readlineInterface = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		readlineInterface.question(question, (answer) => {
			resolve(answer);
			readlineInterface.close();
		});
	});
};

main();
