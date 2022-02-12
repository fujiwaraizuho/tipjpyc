import { exit } from "process";
import { createInterface } from "readline";
import { createConnection } from "typeorm";
import { danger } from "../../app/utils/discord";
import {
	WithdrawRequest,
	WithdrawStatus,
} from "../../database/entity/WithdrawRequest";
import { LedgerSigner } from "../../app/utils/ledger";
import { ethers, providers } from "ethers";
import { getConfig } from "../../app/utils/config";
import jpycV1Abi from "../../abis/JPYCV1Abi";

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
	let tx: ethers.providers.TransactionRequest;

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
	console.log("Cheking deposit history");
	// Todo : deposit historyで特定の日時以降に保存されたデータのuserIdを取得する

	const userIds = ["0", "1"];
	console.info("------------------");
	console.log(`-> UserID[ ${userIds} ]からJPYCを回収します`);

	for (let i = 0; i < userIds.length; i++) {
		const path = `m/44'/60'/1'/${userIds[i]}`;
		const userAddress = await signer.getAddress(path);
		const userNativeTokenBalance = await provider.getBalance(userAddress);

		if (Number.parseInt(userNativeTokenBalance) === 0) {
			tx = {
				to: userAddress,
				value: ethers.utils.parseEther("0.001"),
				data: "",
				gasPrice: "0x218711a00",
				gasLimit: "0x5208",
			};
			let signedTx = signer.signTransaction(tx, path);
			let sendTx = await provider.sendTransaction(signedTx);

			console.log(`->ガス代用のネイティブトークンを送金`);
			console.log(`->txhash : ${sendTx.hash}`);
			await sendTx.wait();
			console.log(`->ガス代用のネイティブトークンの送金完了`);
		}
	}

	const address = await signer.getAddress();
	const balance = await jpycV1Contract.balanceOf(address);

	console.log(`-> Admin Address: ${address}`);
	console.log(`-> All Balance: ${balance} JPYC`);
	console.info("------------------");
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
