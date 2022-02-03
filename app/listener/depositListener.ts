import { exit } from "process";
import { createConnection } from "typeorm";
import { danger } from "../utils/discord";
import { getLogger } from "../utils/logger";

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

	logger.info("-> tipjpyc deposit listener setup is finished!");
};

main();
