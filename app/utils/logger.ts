import * as log4js from "log4js";

export const getLogger = (): log4js.Logger => {
	const logger = log4js.getLogger();
	logger.level = "info";

	return logger;
};
