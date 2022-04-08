import { exit } from "process";
import { createInterface } from "readline";
import { createConnection } from "typeorm";
import { info, danger, warning } from "../../app/utils/discord";
import {
	WithdrawRequest,
	WithdrawStatus,
} from "../../database/entity/WithdrawRequest";
import { LedgerSigner } from "../../app/utils/ledger";
import { ethers } from "ethers";
import { getConfig } from "../../app/utils/config";
import jpycV1Abi from "../../abis/JPYCV1Abi";
import { AlchemyProvider } from "@ethersproject/providers";
import TwitterAPI from "twitter-api-v2";
import { CommandType, Transaction } from "../../database/entity/Transaction";

const explorerUrl = getConfig("EXPLORER_URL");

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

	const client = new TwitterAPI({
		appKey: getConfig("TWITTER_APP_KEY"),
		appSecret: getConfig("TWITTER_APP_SECRET"),
		accessToken: getConfig("TWITTER_ACCESS_TOKEN"),
		accessSecret: getConfig("TWITTER_ACCESS_SECRET"),
	});

	let signer: LedgerSigner;

	try {
		const provider = new AlchemyProvider(
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

	console.log(`-> AdminAddress: ${address}`);

	for (;;) {
		const balance = await jpycV1Contract.balanceOf(address);

		console.log(
			`-> Balance: ${Number.parseInt(
				ethers.utils.formatEther(balance)
			)} JPYC`
		);
		console.info("------------------");

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
			console.info("> 出金処理を開始します...");

			const tx = await jpycV1Contract.populateTransaction.transfer(
				withdrawRequest.address,
				ethers.utils.parseUnits(String(withdrawRequest.amount), 18)
			);

			tx.chainId = Number(getConfig("NETWORK_ID"));
			tx.gasLimit = ethers.BigNumber.from("300000");
			tx.maxPriorityFeePerGas = ethers.utils.parseUnits("40", "gwei");
			tx.maxFeePerGas = ethers.utils.parseUnits("90", "gwei");

			console.info("> Ledger でトランザクションに署名してください");

			let sendTx: ethers.providers.TransactionResponse;

			try {
				sendTx = await signer.sendTransaction(tx);
			} catch (err) {
				withdrawRequest.status = WithdrawStatus.FAILED;
				await withdrawRequest.save();

				console.error(err);
				console.info(
					"> 出金処理が失敗しました、手動で処理しなおしてください"
				);

				continue;
			}

			console.info(`> ${explorerUrl}/tx/${sendTx.hash}`);

			const result = await sendTx.wait(1);

			if (!result.status) {
				withdrawRequest.status = WithdrawStatus.FAILED;
				await withdrawRequest.save();

				console.info(result);
				console.info(
					"> 出金処理が失敗しました、手動で処理しなおしてください"
				);

				continue;
			}

			console.info("> トランザクションがネットワークに承認されました");

			withdrawRequest.txid = result.transactionHash;
			withdrawRequest.status = WithdrawStatus.APPROVAL;
			await withdrawRequest.save();

			console.info("> WithdrawRequest を更新しました");

			await client.v2.reply(
				`${withdrawRequest.amount}JPYC の出金が完了しました!\n${explorerUrl}/tx/${sendTx.hash}`,
				withdrawRequest.transaction.tweet_id
			);

			await info(
				"出金処理が完了しました",
				`ID: ${withdrawRequest.id}\nUserID: ${withdrawRequest.transaction.user_id}\nAddress: ${withdrawRequest.address}\nAmount: ${withdrawRequest.amount}JPYC\nFee: ${withdrawRequest.tax}JPYC`,
				`${explorerUrl}/tx/${sendTx.hash}`
			);

			console.info("> 出金処理が完了しました");
			console.info("------------------");
		} else {
			console.info("> 出金リクエストを非承認とします");

			withdrawRequest.status = WithdrawStatus.DISAPPROVAL;
			await withdrawRequest.save();

			console.info("> WithdrawRequest を更新しました");

			const transaction = new Transaction();

			transaction.user_id = withdrawRequest.transaction.user_id;
			transaction.amount = withdrawRequest.amount + withdrawRequest.tax;
			transaction.command_type = CommandType.OTHER;
			transaction.description = "出金非承認による返金";

			await transaction.save();

			await client.v2.reply(
				`${withdrawRequest.amount}JPYC の出金が承認されませんでした。\nご不明な点があれば DM までご連絡ください。`,
				withdrawRequest.transaction.tweet_id
			);

			await warning(
				"出金リクエストを非承認しました",
				`ID: ${withdrawRequest.id}\nUserID: ${withdrawRequest.transaction.user_id}\nAddress: ${withdrawRequest.address}\nAmount: ${withdrawRequest.amount}JPYC\nFee: ${withdrawRequest.tax}JPYC`
			);

			console.info("> 返金処理が完了しました");
			console.info("------------------");
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
