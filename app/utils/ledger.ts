import { Provider } from "@ethersproject/abstract-provider";
import { LedgerSigner as BaseLedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers } from "ethers";

export class LedgerSigner extends BaseLedgerSigner {
	constructor(provider?: Provider, type?: string, path?: string) {
		super(provider, type, path);
	}

	async getAddress(path: string = this.path): Promise<string> {
		const account = await this._retry((eth) => eth.getAddress(path));
		return ethers.utils.getAddress(account.address);
	}

	async signTransaction(
		transaction: ethers.providers.TransactionRequest,
		path: string = this.path
	): Promise<string> {
		const tx = await ethers.utils.resolveProperties(transaction);
		const baseTx: ethers.utils.UnsignedTransaction = {
			chainId: tx.chainId || undefined,
			data: tx.data || undefined,
			gasLimit: tx.gasLimit || undefined,
			gasPrice: tx.gasPrice || undefined,
			nonce: tx.nonce
				? ethers.BigNumber.from(tx.nonce).toNumber()
				: undefined,
			to: tx.to || undefined,
			value: tx.value || undefined,
		};

		const unsignedTx = ethers.utils
			.serializeTransaction(baseTx)
			.substring(2);
		const sig = await this._retry((eth) =>
			eth.signTransaction(path, unsignedTx)
		);

		return ethers.utils.serializeTransaction(baseTx, {
			v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
			r: "0x" + sig.r,
			s: "0x" + sig.s,
		});
	}
}
