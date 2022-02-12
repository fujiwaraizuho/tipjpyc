import { Provider } from "@ethersproject/abstract-provider";
import { LedgerSigner as BaseLedgerSigner } from "@tipjpyc/hardware-wallets";
import { ethers } from "ethers";

import ledgerService from "@ledgerhq/hw-app-eth/lib/services/ledger";
import { getLoadConfig } from "@ledgerhq/hw-app-eth/lib/services/ledger/loadConfig";

export class LedgerSigner extends BaseLedgerSigner {
	constructor(provider?: Provider, type?: string, path?: string) {
		super(provider, type, path);
	}

	async getAddress(path: string = this.path): Promise<string> {
		const account = await this._retry((eth) => eth.getAddress(path));
		return ethers.utils.getAddress(account.address);
	}

	async signMessage(
		message: ethers.utils.Bytes | string,
		path: string = this.path
	): Promise<string> {
		if (typeof message === "string") {
			message = ethers.utils.toUtf8Bytes(message);
		}

		const messageHex = ethers.utils.hexlify(message).substring(2);
		const sig = await this._retry((eth) =>
			eth.signPersonalMessage(path, messageHex)
		);

		sig.r = "0x" + sig.r;
		sig.s = "0x" + sig.s;

		return ethers.utils.joinSignature(sig);
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
			// maxFeePerGas: tx.maxFeePerGas || undefined,
			// maxPriorityFeePerGas: tx.maxPriorityFeePerGas || undefined,
			// type: tx.type,
			to: tx.to || undefined,
			value: tx.value || undefined,
		};

		const unsignedTx = ethers.utils
			.serializeTransaction(baseTx)
			.substring(2);

		const resolution = await ledgerService.resolveTransaction(
			unsignedTx,
			getLoadConfig(),
			{
				externalPlugins: true,
				erc20: true,
				nft: true,
			}
		);

		const sig = await this._retry((eth) =>
			eth.signTransaction(path, unsignedTx, resolution)
		);

		return ethers.utils.serializeTransaction(baseTx, {
			v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
			r: "0x" + sig.r,
			s: "0x" + sig.s,
		});
	}
}
