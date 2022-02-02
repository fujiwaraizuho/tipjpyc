import { ethers } from "ethers";
import { getConfig } from "./config";

export const getDepositAddress = (userId: number): string => {
	const masterXpub = getConfig("ETHERS_MASTER_XPUB");
	const node = ethers.utils.HDNode.fromExtendedKey(masterXpub);

	return node.derivePath(userId.toString()).address;
};
