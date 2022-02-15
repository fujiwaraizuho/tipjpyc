import { ethers } from "ethers";
import { exit } from "process";
import { getConfig } from "../../app/utils/config";
import { LedgerSigner } from "../../app/utils/ledger";
import jpycV1Abi from "../../abis/JPYCV1Abi";

const PATH = "m/44'/60'/1'/0";

const APPROVAL_AMOUNT = "10000000";
const NUMBER_OF_USER = 100;

const NETWORK_ID = 137;
const NETWORK_TYPE = "matic";
const ALCHEMY_API_KEY = "ZQWLPV4ru0g0uiu_GaP919pvrFUSf2ht";

const main = async () => {
	console.info("--------- Approval Script ---------");

	const provider = new ethers.providers.AlchemyProvider(
		NETWORK_TYPE,
		ALCHEMY_API_KEY
	);
	const signer = new LedgerSigner(provider, "hid");
};

main();
