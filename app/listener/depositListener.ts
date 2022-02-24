import { exit } from "process";
import { Connection, createConnection } from "typeorm";
import { danger } from "../utils/discord";
import { getLogger } from "../utils/logger";
import { ethers } from "ethers";
import { User } from "../../database/entity/User";
import { NetworkType } from "../../database/entity/DepositHistory";
import jpycv1Abi from "../../abis/JPYCV1Abi";
import { getConfig } from "../utils/config";
import { DepositQueue } from "../../database/entity/DepositQueue";

const main = async () => {
	const logger = getLogger();

	logger.info("--- Welcome to tipJPYC Deposit Listener! ---");

	let contract: ethers.Contract;
	let connection: Connection;

	const rpc = getConfig("RPC_WSS");
	const contractAddess = getConfig("JPYC_CONTRACT_ADDRESS");

	try {
		logger.info("-> Try connection database...");
		connection = await createConnection();

		const webSocketProvider = new ethers.providers.WebSocketProvider(rpc);
		contract = new ethers.Contract(
			contractAddess,
			jpycv1Abi,
			webSocketProvider
		);
	} catch (err) {
		logger.error("Database Connection Error!");
		await danger("Database Connection ERROR!", JSON.stringify(err));
		exit();
	}

	logger.info(
		`-> Listening transfer event on countract addres of ${contract.address}`
	);

	try {
		contract.on("Transfer", async (_, to, value, event) => {
			const amount = Math.floor(
				Number.parseInt(ethers.utils.formatEther(value))
			);

			if (amount === 0) {
				logger.info("-> Deposit amount is less than zero");
				return;
			}

			logger.info(
				`-> Transfer ${amount} JPYC to ${to} (${event.transactionHash})`
			);

			const user = await User.findOne({
				address: to,
			});

			if (user === undefined) {
				logger.info(`-> Ignore event (${event.transactionHash})`);
				return;
			}

			const checkDepositQueue = await DepositQueue.findOne({
				txid: event.transactionHash,
			});

			if (checkDepositQueue !== undefined) {
				logger.info(`-> Ignore same txid (${event.transactionHash})`);
				return;
			}

			logger.info(
				`-> Proccessing deposit tx: ${amount} JPYC to ${user.id} (${event.transactionHash})`
			);

			const queryRunner = connection.createQueryRunner();
			await queryRunner.connect();

			await queryRunner.startTransaction();

			try {
				const depositQueue = new DepositQueue();

				depositQueue.user_id = user.id;
				depositQueue.txid = event.transactionHash;
				depositQueue.amount = amount;
				depositQueue.network_type = NetworkType.POLYGON;

				await queryRunner.manager.save(DepositQueue, depositQueue);

				await queryRunner.commitTransaction();
			} catch (err) {
				await queryRunner.rollbackTransaction();

				if (err.code === "ER_DUP_ENTRY") {
					logger.info("-> Through Duplicate Trasnsaction");
					return;
				}

				logger.error(err);
				await danger("Process Error!", JSON.stringify(err));

				return;
			} finally {
				await queryRunner.release();
			}

			logger.info(`-> Deposit Queued (${event.transactionHash})`);
		});
	} catch (err) {
		logger.error(err);
		await danger("Process Error!", JSON.stringify(err));
		exit();
	}

	logger.info("-> TipJPYC deposit listener setup is finished!");
};

main();
