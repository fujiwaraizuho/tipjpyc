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
		const adminPath = "m/44'/60'/1'/1";
		const adminAddress = signer.getAddress(adminPath);
		const path = `m/44'/60'/1'/${userIds[i]}`;
		const userAddress = await signer.getAddress(path);
		const userNativeTokenBalance = await provider.getBalance(userAddress);

		let signedTx;
		let sendTx;

		if (Number.parseInt(userNativeTokenBalance) === 0) {
			console.log(`>ガス代用のネイティブトークンを送金します`);

			tx = {
				to: userAddress,
				value: ethers.utils.parseEther("0.001"),
				data: "",
				gasPrice: "0x218711a00",
				gasLimit: "0x5208",
			};
			signedTx = signer.signTransaction(tx, path);
			sendTx = await provider.sendTransaction(signedTx);

			console.log(`
				-> https://${networkType}.etherscan.io/tx/${sendTx.hash}
			`);
			await sendTx.wait();
			console.log(`>ガス代用のネイティブトークンの送金完了`);
		}

		const allowance = await jpycV1Contract.allowance(
			userAddress,
			adminAddress
		);

		let iface: ethers.utils.Interface;
		let functionData: string;

		if (Number.parseInt(allowance) != 0) {
			console.log(">利用者のJPYCを管理者にAPPROVEします");

			iface = new ethers.utils.Interface([
				"function approve(address spender, uint256 amount)",
			]);
			functionData = iface.encodeFunctionData("approve", [
				adminAddress,
				"100000000000000000000000000000000000000000000",
			]);
			//Todo: approveする額の決定

			tx = {
				from: userAddress,
				to: contractAddress,
				value: "",
				data: functionData,
			};

			signedTx = signer.signTransaction(tx, path);
			sendTx = await provider.sendTransaction(signedTx);

			console.log(
				`-> https://${networkType}.etherscan.io/tx/${sendTx.hash}`
			);
			await sendTx.wait();
			console.log(">APPROVE完了");
		}

		const balance = await jpycV1Contract.balanceOf(userAddress);

		console.info(
			`> ${balance}JPYCをUserId ${userIds[i]}(${userAddress})から${adminAddress}に送金します`
		);

		iface = new ethers.utils.Interface([
			"function transferFrom(address sender, address recipient, uint256 amount)",
		]);
		functionData = iface.encodeFunctionData("transferFrom", [
			userAddress,
			adminAddress,
			balance,
		]);

		tx = {
			from: userAddress,
			to: contractAddress,
			value: "",
			data: functionData,
		};

		signedTx = signer.signTransaction(tx, path);
		sendTx = await provider.sendTransaction(signedTx);

		console.log(`-> https://${networkType}.etherscan.io/tx/${sendTx.hash}`);
		await sendTx.wait();
		console.log(">JPYCの送金完了");
	}
};

main();
