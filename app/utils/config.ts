import * as dotenv from "dotenv";
dotenv.config();

export const getConfig = (name: string): string => {
	return process.env[name];
};
