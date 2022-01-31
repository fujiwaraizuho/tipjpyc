import * as dotenv from "dotenv";
import { exit } from "process";
import { getLogger } from "./logger";
dotenv.config();

export const getConfig = (name: string): string => {
	const result = process.env[name];

	if (!result) {
		getLogger().error(`${name} is undefined!`);
		exit();
	}

	return result;
};
