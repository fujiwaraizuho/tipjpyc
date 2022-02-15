import { ethers } from "ethers";
import { exit } from "process";
import { getConfig } from "../../app/utils/config";
import { LedgerSigner } from "../../app/utils/ledger";
import jpycV1Abi from "../../abis/JPYCV1Abi";

const PATH = "m/44'/60'/1'/0";

const APPROVAL_AMOUNT = "10000000";

const START_USERID = Number(process.argv[2]);
const END_USERID = Number(process.argv[3]);

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

	const adminAddress = await signer.getAddress(PATH);
	console.info(`-> AdminAddress: ${adminAddress} (${PATH})`);

	const jpycV1Contract = new ethers.Contract(
		getConfig("JPYC_CONTRACT_ADDRESS"),
		jpycV1Abi
	);
	console.info(
		`-> Approval from ${END_USERID - START_USERID + 1} deposit address.`
	);
	console.info("--------------------");

	for (let i = START_USERID; i <= END_USERID; i++) {
		const userPath = `m/44'/60'/0'/${i}`;
		const userAddress = await signer.getAddress(userPath);

		console.info(`-> Start pproval: ${i}/${END_USERID}`);
		console.info(`[${i}] Address = ${userAddress}`);

		const tx = await jpycV1Contract.populateTransaction.approve(
			adminAddress,
			ethers.utils.parseUnits(APPROVAL_AMOUNT, 18)
		);

		tx.chainId = NETWORK_ID;
		tx.gasLimit = ethers.BigNumber.from("300000");
		tx.nonce = await provider.getTransactionCount(userAddress);
		tx.type = 2;

		console.info("> Ledger でトランザクションに署名してください");

		let sendTx: ethers.providers.TransactionResponse;

		try {
			const populateTx = await signer.populateTransaction(tx);
			const unsignedTx = await signer.signTransaction(
				populateTx,
				userPath
			);
			sendTx = await provider.sendTransaction(unsignedTx);
		} catch (err) {
			console.error(err);
			console.info(
				`> 署名に失敗しました。${i}から処理しなおしてください`
			);
			exit();
		}

		console.info(`[${i}] https://polygonscan.com/tx/${sendTx.hash}`);

		const sentTx = await sendTx.wait(1);

		if (!sentTx.status) {
			console.error(`[${i}] Failed TX...`);
			continue;
		}

		console.info(`[${i}] Success TX!`);
		console.info("--------------------");
	}

	console.info("-> Complete Approval from deposit account");
};

main();
