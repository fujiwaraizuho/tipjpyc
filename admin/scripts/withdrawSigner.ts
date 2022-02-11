import { exit } from "process";
import { createInterface } from "readline";
import { createConnection } from "typeorm";
import { danger } from "../../app/utils/discord";
import {
	WithdrawRequest,
	WithdrawStatus,
} from "../../database/entity/WithdrawRequest";
import { LedgerSigner } from "../../app/utils/ledger";
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
		const provider = new ethers.providers.AlchemyProvider(
			getConfig("NETWORK_TYPE"),
			getConfig("ALCHEMY_API_KEY")
		);
		signer = new LedgerSigner(provider, "hid", "m/44'/60'/1'/0");
	} catch (err) {
		console.log(err);
		console.error("Provider or Signer Error!");
		await danger("Provider or Signer Connection ERROR!", String(err));
		exit();
	}

	const jpycV1Contract = new ethers.Contract(
		getConfig("JPYC_CONTRACT_ADDRESS"),
		jpycV1Abi,
		signer
	);

	const address = await signer.getAddress();
	const balance = await jpycV1Contract.balanceOf(address);

	console.log(`-> Admin Address: ${address}`);
	console.log(`-> All Balance: ${balance} JPYC`);
	console.info("------------------");

	for (;;) {
		const withdrawRequest = await WithdrawRequest.findOne(
			{
				status: WithdrawStatus.UNBUSY,
			},
			{
				order: {
					createdAt: "ASC",
				},
				relations: ["transaction"],
			}
		);

		if (withdrawRequest === undefined) {
			console.info("> 処理できる出金リクエストがありません");
			exit();
		}

		withdrawRequest.status = WithdrawStatus.BUSY;
		await withdrawRequest.save();

		console.info(`[Withdraw Request #${withdrawRequest.id}]`);
		console.info(`CurrentStatus: ${withdrawRequest.status}`);
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
