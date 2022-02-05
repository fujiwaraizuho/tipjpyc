import { exit } from "process";
import { createInterface } from "readline";
import { createConnection } from "typeorm";
import { danger } from "../../app/utils/discord";
import {
	WithdrawRequest,
	WithdrawStatus,
} from "../../database/entity/WithdrawRequest";
import { LedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers } from "ethers";
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

	let signer: LedgerSigner;

	try {
		const provider = new ethers.providers.AlchemyProvider("", "");
		signer = new LedgerSigner(provider, "default", "m/44'/60'/1'/0");
	} catch (err) {
		console.error("Provider or Signer Error!");
		await danger("Provider or Signer Connection ERROR!", String(err));
		exit();
	}

	const jpycV1Contract = new ethers.Contract(
		getConfig("JPYC_CONTRACT_ADDRESS"),
		jpycV1Abi,
		signer
	);

	const address = signer.getAddress();
	const balance = await jpycV1Contract.balanceOf(address);

	console.log(`-> Address: ${address}`);
	console.log(`-> Balance: ${balance}`);
	console.info("------------------");

	for (;;) {
		const withdrawRequest = await WithdrawRequest.findOne(
			{
				status: WithdrawStatus.UNCOMPLETED,
			},
			{
				order: {
					createdAt: "ASC",
				},
				relations: ["transaction"],
			}
		);

		if (withdrawRequest === undefined) {
			console.info("処理できる出金リクエストがありません!");
			exit();
		}

		withdrawRequest.status = WithdrawStatus.LOCKING;
		await withdrawRequest.save();

		console.log(`[Withdraw Request #${withdrawRequest.id}]`);
		console.log(`CurrentStatus: ${withdrawRequest.status}`);
		console.info(`UserID: ${withdrawRequest.transaction.user_id}`);
		console.info(`Address: ${withdrawRequest.address}`);
		console.info(`Amount: ${withdrawRequest.amount} JPYC`);
		console.info(`Tax: ${withdrawRequest.tax} JPYC`);
		console.info(`CreatedAt: ${withdrawRequest.createdAt}`);

		console.info("------------------");

		if (
			await confirm("この出金リクエストを承認しますか？", withdrawRequest)
		) {
			console.info("------------------");
			// 出金処理を行ってステータスを ACCEPT に変更 (失敗したら FAILED に変更)
		} else {
			console.info("------------------");
			// ステータスを REJECT に変更して残高を返す
		}
	}
};

const confirm = async (message: string, withdrawRequest: WithdrawRequest) => {
	const answer = await question(`> ${message} (y/n/e): `);

	if (answer.trim().toLowerCase() === "y") {
		return true;
	} else if (answer.trim().toLowerCase() === "n") {
		return false;
	} else {
		console.info("------------------");
		console.info("> 終了処理を行います");

		withdrawRequest.status = WithdrawStatus.UNCOMPLETED;
		await withdrawRequest.save();

		console.info("> 終了処理が完了しました");
		exit();
	}
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
