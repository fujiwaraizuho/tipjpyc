import { AlchemyProvider } from "@ethersproject/providers";
import { ethers } from "ethers";
import { exit } from "process";

const DEPOSIT_XPUB_ADDRESS =
	"xpub6D7JHGFsqhn9BXGTwKn9NHhNt8wrHqBfRqV4cWUhaWtEnMZjfLwpwRWUKMdpGSdyetfYPrNRUsL5uM4enNekMip4dUSR98cS4miDsrdYeV1";

const MNEMONIC =
	"sugar write space awake fold vague great tail rib gallery then claim tiger crater boring airport oyster please clutch amused easily transfer suggest amateur";
const PATH = "m/44'/60'/1'/0";

const FEE_PER_USER = "0.01";
const NUMBER_OF_USER = 100;

const NETWORK_ID = 137;
const NETWORK_TYPE = "matic";
const ALCHEMY_API_KEY = "ZQWLPV4ru0g0uiu_GaP919pvrFUSf2ht";

const main = async () => {
	console.info("--------- Transfer GAS Script ---------");

	const provider = new AlchemyProvider(NETWORK_TYPE, ALCHEMY_API_KEY);
	const signer = ethers.Wallet.fromMnemonic(MNEMONIC, PATH);

	console.info(`-> SignerAddress: ${signer.address} (${PATH})`);

	const balance = await provider.getBalance(signer.address);
	const formatedBalance = ethers.utils.formatEther(balance);

	console.info(`-> Balance: ${formatedBalance} MATIC`);

	// FEE_PER_USER * NUMBER_OF_USER > BALANCE
	if (
		ethers.BigNumber.from(ethers.utils.parseEther(FEE_PER_USER))
			.mul(ethers.BigNumber.from(NUMBER_OF_USER))
			.gt(balance)
	) {
		console.error(
			`-> Not enough balance. (need: ${
				parseFloat(FEE_PER_USER) * NUMBER_OF_USER
			} MATIC)`
		);
		exit();
	}

	const userNode = ethers.utils.HDNode.fromExtendedKey(DEPOSIT_XPUB_ADDRESS);

	console.info(`-> Send the gas to the address of ${NUMBER_OF_USER} users.`);
	console.info("--------------------");

	for (let i = 1; i <= NUMBER_OF_USER; i++) {
		const user = userNode.derivePath(i.toString());

		console.info(`-> UserAddress: ${i}/${NUMBER_OF_USER}`);
		console.info(`[${i}] Address = ${user.address}`);

		const tx: ethers.providers.TransactionRequest = {
			chainId: NETWORK_ID,
			to: user.address,
			value: ethers.utils.parseEther(FEE_PER_USER.toString()),
			gasLimit: ethers.BigNumber.from("300000"),
		};

		const unsignedTx = await signer.signTransaction(tx);
		const sendTx = await provider.sendTransaction(unsignedTx);

		console.info(`[${i}] https://polygonscan.com/tx/${sendTx.hash}`);

		const sentTx = await sendTx.wait(1);

		if (!sentTx.status) {
			console.error(`[${i}] Failed TX...`);
			continue;
		}

		console.info(`[${i}] Success TX!`);
		console.info("--------------------");
	}

	console.info("-> Complete the gas to the addresses");
};

main();
