import { getConfig } from "./config";

const env = getConfig("ENV");

export const isProduction = (): boolean => {
	return env === "production" || env === "prod";
};

export const isDevelopment = (): boolean => {
	return env === "development" || env === "dev";
};
