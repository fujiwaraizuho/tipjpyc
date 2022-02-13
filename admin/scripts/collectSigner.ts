import { exit } from "process";
import { createInterface } from "readline";
import { createConnection, getRepository } from "typeorm";
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
		.select("user.id")
		.getMany();

	let userIds = [];
	for (let i = 0; i < users.length; i++) {
		const userId = users[i].id;
		const path = `m/44'/60'/1'/${userId}`;
		const userAddress = await signer.getAddress(path);

		const userBalance = await jpycV1Contract.balanceOf(userAddress);
		if (Number(ethers.utils.formatUnits(userBalance, 18)) >= 50) {
			userIds.push(userId);
		}
	}

	if (!userIds.length) {
		console.info("> 回収できるJPYCはありません");
		exit();
	}

	console.info("------------------");
	console.log(`-> UserID[ ${userIds} ]からJPYCを回収します`);

	for (let i = 0; i < userIds.length; i++) {
		const adminPath = "m/44'/60'/0'/1";
		const adminAddress = await signer.getAddress(adminPath);

		const path = `m/44'/60'/1'/${userIds[i]}`;
		const userAddress = await signer.getAddress(path);

		const chainId = 4; // todo:環境変数にする？
		const userNativeTokenBalance = await provider.getBalance(userAddress);

		let tx: ethers.providers.TransactionRequest;
		let signedTx: string;
		let sendTx: ethers.providers.TransactionResponse;

		if (userNativeTokenBalance.isZero()) {
			console.log(`>ガス代用のネイティブトークンを送金します`);

			tx = {
				chainId: chainId,
				to: userAddress,
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
			userAddress,
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
				from: userAddress,
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

		const balance = await jpycV1Contract.balanceOf(userAddress);

		console.info(
			`> ${balance}JPYCをUserId ${userIds[i]}(${userAddress})から${adminAddress}に送金します`
		);

		functionData = iface.encodeFunctionData("transferFrom", [
			userAddress,
			adminAddress,
			balance,
		]);

		tx = {
			chainId: chainId,
			from: userAddress,
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

main();
