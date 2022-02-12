import { ethers } from "ethers";
import { exit } from "process";
import { createConnection, getConnection } from "typeorm";
import {
	DepositQueue,
	DepositQueueStatus,
} from "../../database/entity/DepositQueue";
import { getConfig } from "../utils/config";
import { danger, info, warning } from "../utils/discord";
import { getLogger } from "../utils/logger";
import { CommandType, Transaction } from "../../database/entity/Transaction";
import {
	DepositHistory,
	NetworkType,
} from "../../database/entity/DepositHistory";
import { isProduction } from "../utils/env";

const main = async () => {
	const logger = getLogger();

	logger.info("--- Start checkDepositConfirm Batch ---");

	let provider: ethers.providers.AlchemyProvider;

	const network = getConfig("NETWORK_TYPE");
	const alchemyKey = getConfig("ALCHEMY_API_KEY");

	try {
		logger.info("-> Try connection database...");
		await createConnection();
		provider = new ethers.providers.AlchemyProvider(network, alchemyKey);
	} catch (err) {
		logger.error("Database Connection Error!");
		await danger("Database Connection ERROR!", JSON.stringify(err));
		exit();
	}

	logger.info("-> connected database & provider");
	logger.info(`-> Fetch deposit with status = UNCONFIRM ...`);

	const depositQueues = await DepositQueue.find({
		select: ["id", "status", "txid"],
		where: {
			status: DepositQueueStatus.UNCONFIRM,
		},
		order: {
			createdAt: "ASC",
		},
	});

	logger.info(`-> processing ${depositQueues.length} deposits...`);

	for (const depositQueue of depositQueues) {
		logger.info(`[${depositQueue.id}] Start process...`);

		try {
			const confirmations = (
				await provider.getTransaction(depositQueue.txid)
			).confirmations;

			if (confirmations < 3) {
				logger.info(
					`[${depositQueue.id}] Skip confirmations < 3 (current: ${confirmations})`
				);
				continue;
			}
		} catch (err) {
			logger.info(`[${depositQueue.id}] Skip provider error.`);
			logger.error(err);

			await warning(
				"トランザクションの承認数を取得できませんでした",
				JSON.stringify(err)
			);

			continue;
		}

		const queryRunner = getConnection().createQueryRunner();
		await queryRunner.connect();

		await queryRunner.startTransaction();

		logger.info(`[${depositQueue.id}] Start Transaction.`);

		try {
			const lockedDepositQueue = await queryRunner.manager
				.getRepository(DepositQueue)
				.createQueryBuilder("depositQueue")
				.where("depositQueue.id = :id", {
					id: depositQueue.id,
				})
				.setLock("pessimistic_write_or_fail")
				.getOne();

			lockedDepositQueue.user = await queryRunner.manager
				.createQueryBuilder()
				.relation(DepositQueue, "user")
				.of(lockedDepositQueue)
				.loadOne();

			logger.info(`[${depositQueue.id}] Get Locked.`);

			if (lockedDepositQueue.status === DepositQueueStatus.CONFIRMED) {
				logger.info(`[${depositQueue.id}] already deposited.`);
				continue;
			}

			const transaction = new Transaction();

			transaction.user_id = lockedDepositQueue.user_id;
			transaction.amount = lockedDepositQueue.amount;
			transaction.command_type = CommandType.DEPOSIT;

			await queryRunner.manager.save(Transaction, transaction);

			logger.info(`[${depositQueue.id}] Create Transaction.`);

			const depositHistory = new DepositHistory();

			depositHistory.transaction_id = transaction.id;
			depositHistory.deposit_queue_id = lockedDepositQueue.id;
			depositHistory.txid = lockedDepositQueue.txid;
			depositHistory.amount = lockedDepositQueue.amount;
			depositHistory.network_type = NetworkType.POLYGON;

			await queryRunner.manager.save(DepositHistory, depositHistory);

			logger.info(`[${depositQueue.id}] Create DepositHistory`);

			lockedDepositQueue.status = DepositQueueStatus.CONFIRMED;

			await queryRunner.manager.save(DepositQueue, lockedDepositQueue);

			logger.info(`[${depositQueue.id}] Change DepositQueue Status.`);

			await queryRunner.commitTransaction();

			logger.info(`[${depositQueue.id}] Deposited.`);

			if (isProduction()) {
				await info(
					"入金が完了しました",
					`Amount: ${transaction.amount}JPYC\nTo: https://twitter.com/intent/user?user_id=${lockedDepositQueue.user.twitter_id}\n`,
					`https://etherscan.io/tx/${lockedDepositQueue.txid}`
				);
			}
		} catch (err) {
			await queryRunner.rollbackTransaction();

			logger.info(`[${depositQueue.id}] Skip DepositQueue.`);
			logger.error(err);

			await warning(
				"対象行のロックが取れなかったか、不明なエラーです",
				JSON.stringify(err)
			);

			continue;
		} finally {
			await queryRunner.release();
		}
	}

	logger.info(`-> done`);
	exit(0);
};

main();
