import { ethers } from "ethers";

const main = async () => {
	const entropy = ethers.utils.randomBytes(32);
	const mnemonicPhrase = ethers.utils.entropyToMnemonic(entropy);

	console.log(`MnemonicPhrase: \n${mnemonicPhrase}\n`);

	const privateNode = ethers.utils.HDNode.fromMnemonic(mnemonicPhrase);
	const publicNode = privateNode.derivePath("m/44'/60'/0'").neuter();

	const xpub = publicNode.extendedKey;

	console.log(`DepositAddress XPUB (m/44'/60'/0'): \n${xpub}\n`);

	const firstUserAddress = publicNode.derivePath("1").address;

	console.log(`FirstUserAddress (m/44'/60'/0'/1): \n${firstUserAddress}\n`);

	const adminAddress = privateNode.derivePath("m/44'/60'/1'/0").address;
	console.log(`AdminAddress (m/44'/60'/1'/0): \n${adminAddress}`);
};

main();
