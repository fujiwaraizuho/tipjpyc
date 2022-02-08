import { exit } from "process";
import { createConnection, getConnection } from "typeorm";
import { danger, info } from "../utils/discord";
import { getLogger } from "../utils/logger";
import { ethers } from "ethers";
import { User } from "../../database/entity/User";
import {
	DepositHistory,
	NetworkType,
} from "../../database/entity/DepositHistory";
import { CommandType, Transaction } from "../../database/entity/Transaction";
import jpycv1Abi from "../../abis/JPYCV1Abi";
import { getConfig } from "../utils/config";

const main = async () => {
	const logger = getLogger();

	logger.info("--- Welcome to tipJPYC Deposit Listener! ---");

	let contract: ethers.Contract;
	let provider: ethers.providers.AlchemyProvider;

	const rpc = getConfig("RPC_WSS");
	const contractAddess = getConfig("JPYC_CONTRACT_ADDRESS");
	const network = getConfig("NETWORK_TYPE");
	const alchemyKey = getConfig("ALCHEMY_KEY");

	try {
		logger.info("-> Try connection database...");
		await createConnection();

		const webSocketProvider = new ethers.providers.WebSocketProvider(rpc);
		provider = new ethers.providers.AlchemyProvider(network, alchemyKey);
		contract = new ethers.Contract(
			contractAddess,
			jpycv1Abi,
			webSocketProvider
		);
	} catch (err) {
		logger.error("Database Connection Error!");
		await danger("Database Connection ERROR!", String(err));
		exit();
	}

	logger.info(
		`-> Listening transfer event on countract addres of ${contract}`
	);

	try {
		contract.on("Transfer", async (from, to, value, event) => {
			logger.info(
				`-> Transfer ${value}JPYC from ${from} to ${value}, txhash is ${event.transactionHash}`
			);

			// 1confirmationまつ
			await provider.waitForTransaction(event.transactionHash, 1);

			const user = await User.findOne({
				address: to,
			});

			// userのアドレスとtoが一致しなかったら終了
			if (user === undefined) {
				logger.info("-> Ignore event");
				return;
			}

			const checkDepositHistory = await DepositHistory.findOne({
				txid: event.transactionHash,
			});

			// 同じtxhashがあったら終了
			if (checkDepositHistory != undefined) {
				logger.info("-> Ignore same transaction hash");
				return;
			}

			const amount = Math.floor(
				Number.parseInt(ethers.utils.formatEther(value))
			);

			if (amount === 0) {
				logger.info("-> Deposit amount is less than zero");
				return;
			}

			logger.info(
				`-> Proccessing deposit transaction: ${amount}JPYC to @${user.twitter_id}`
			);

			const queryRunner = getConnection().createQueryRunner();

			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				const transaction = new Transaction();

				transaction.user_id = user.id;
				transaction.amount = amount;
				transaction.command_type = CommandType.DEPOSIT;

				await queryRunner.manager.save(Transaction, transaction);

				const depositHistory = new DepositHistory();

				depositHistory.transaction_id = transaction.id;
				depositHistory.txid = event.transactionHash;
				depositHistory.amount = amount;
				depositHistory.network_type = NetworkType.POLYGON;

				await queryRunner.manager.save(DepositHistory, depositHistory);

				await queryRunner.commitTransaction();
			} catch (err) {
				await queryRunner.rollbackTransaction();

				logger.error(err);
				await danger("Process Error!", String(err));
			} finally {
				await queryRunner.release();
			}

			logger.info("-> Deposited");

			await info(
				"入金が完了しました",
				`Amount: ${amount}JPYC\nTo: ${user.twitter_id}`
			);
		});
	} catch (err) {
		logger.error(err);
		await danger("Process Error!", String(err));
	}

	logger.info("-> tipjpyc deposit listener setup is finished!");
};

main();
