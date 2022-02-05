import { exit } from "process";
import { createConnection, getConnection } from "typeorm";
import { danger } from "../utils/discord";
import { getLogger } from "../utils/logger";
import { ethers } from "ethers";
import { User } from "../../database/entity/User";
import {
	DepositHistory,
	NetworkType,
} from "../../database/entity/DepositHistory";
import { CommandType, Transaction } from "../../database/entity/Transaction";
import jpycv1abi from "./jpycv1abi.json";
import { getConfig } from "../utils/config";

const main = async () => {
	const logger = getLogger();

	logger.info("--- Welcome to tipJPYC Deposit Listener! ---");

	try {
		logger.info("-> Try connection database...");
		await createConnection();
	} catch (err) {
		logger.error("Database Connection Error!");
		danger("Database Connection ERROR!", err);
		exit();
	}

	//
	const rpc = getConfig("EPC_WSS");
	const contractAddess = getConfig("JPYC_CONTRACT_ADDRESS");
	const webSocketProvider = new ethers.providers.WebSocketProvider(rpc);
	const contract = new ethers.Contract(
		contractAddess,
		jpycv1abi.abi,
		webSocketProvider
	);

	contract.on("Transfer", async (from, to, value, event) => {
		// asynにしてるが多数のEventが発火された時どうなるか
		// Todo: utils/user.ts でgetUserByAddress()を作るか聞く
		let user = await User.findOne({
			address: from,
		});

		// userのアドレスとfromが一致していたら処理
		if (user != undefined) {
			let depositHistory = await DepositHistory.findOne({
				txid: event.transactionHash,
			});

			// 同じtxhashがなかったら処理
			if (depositHistory != undefined) {
				const queryRunner = getConnection().createQueryRunner();

				await queryRunner.connect();
				await queryRunner.startTransaction();

				try {
					// transactionへの書き込み
					const transaction = new Transaction();

					transaction.user_id = user.id;
					// Todo: depositの際,tweet_idは必要か
					// Todo: 小数点以下送られてきたらどうするか→反映しない？
					transaction.amount = Number.parseInt(value);
					transaction.command_type = CommandType.DEPOSIT;

					await queryRunner.manager.save(Transaction, transaction);

					// deposit_historyへの書き込み
					const depositHistory = new DepositHistory();

					depositHistory.transaction_id = transaction.id;
					depositHistory.txid = event.transactionHash;
					// Todo: 小数点以下送られてきたらどうするか→反映しない？
					depositHistory.amount = Number.parseInt(value);
					depositHistory.network_type = NetworkType.POLYGON;

					await queryRunner.manager.save(
						DepositHistory,
						depositHistory
					);

					await queryRunner.commitTransaction();
				} catch (err) {
					await queryRunner.rollbackTransaction();

					logger.error(err);
					danger("Process Error!", JSON.stringify(err));
				} finally {
					await queryRunner.release();
				}
			}
		}
	});

	logger.info("-> tipjpyc deposit listener setup is finished!");
};

const transferListener = async () => {};

main();
