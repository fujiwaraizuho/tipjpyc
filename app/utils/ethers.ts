import { ethers } from "ethers";
import { getConfig } from "./config";

export const getDepositAddress = (userId: number): string => {
	const masterXpub = getConfig("ETHERS_MASTER_XPUB");
	const node = ethers.utils.HDNode.fromExtendedKey(masterXpub);

	// m/44'/60'/0'/{user_id}
	return node.derivePath(userId.toString()).address;
};
