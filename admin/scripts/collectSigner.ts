import { exit } from "process";
import { createInterface } from "readline";
import { createConnection, getRepository } from "typeorm";
import { danger } from "../../app/utils/discord";
import { LedgerSigner } from "../../app/utils/ledger";
import { ethers } from "ethers";
import { getConfig } from "../../app/utils/config";
import jpycV1Abi from "../../abis/JPYCV1Abi";
import { User } from "../../database/entity/User";

const networkType = getConfig("NETWORK_TYPE");
const explorerUrl = getConfig("EXPLORER_URL");

const main = async () => {
	console.info("--- Welcome to tipJPYC Withdraw Signer! ---");

	try {
		console.info("-> Try connection database...");
		await createConnection();
	} catch (err) {
		console.error("Database Connection Error!");
		await danger("Database Connection ERROR!", err);
		exit();
	}

	const contractAddress = getConfig("JPYC_CONTRACT_ADDRESS");

	let provider: ethers.providers.AlchemyProvider;
	let signer: LedgerSigner;

	try {
		provider = new ethers.providers.AlchemyProvider(
			networkType,
			getConfig("ALCHEMY_API_KEY")
		);
		signer = new LedgerSigner(provider, "hid");
	} catch (err) {
		console.log(err);
		console.error("Provider or Signer Error!");
		await danger("Provider or Signer Connection ERROR!", String(err));
		exit();
	}

	const jpycV1Contract = new ethers.Contract(
		contractAddress,
		jpycV1Abi,
		signer
	);

	console.info("------------------");
	console.log("> Cheking deposit addresses balance");

	const users = await getRepository(User)
		.createQueryBuilder("user")
		.select(["user.id", "user.address"])
		.getMany();

	let targetUsers = [];
	for (let i = 0; i < users.length; i++) {
		const userBalance = await jpycV1Contract.balanceOf(users[i].address);
		console.info(
			`UserId[
				${users[i].id}
			]の入金用アドレス（${users[i].address}）に${ethers.utils.formatUnits(
				userBalance,
				18
			)}JPYCあります`
		);
		if (Number(ethers.utils.formatUnits(userBalance, 18)) >= 50) {
			targetUsers.push(users[i]);
		}
	}

	if (!targetUsers.length) {
		console.info("> 回収できるJPYCはありません");
		exit();
	}

	console.info("------------------");
	console.log(`-> ${targetUsers.length}つの入金アドレスからJPYCを回収します`);

	for (let i = 0; i < targetUsers.length; i++) {
		const adminPath = "m/44'/60'/1'/0";
		const adminAddress = await signer.getAddress(adminPath);

		const targetUser = targetUsers[i];
		const userPath = `m/44'/60'/0'/${targetUser.id}`;

		const chainId = Number(getConfig("NETWORK_ID"));

		let tx: ethers.providers.TransactionRequest;

		const userNativeTokenBalance = await provider.getBalance(
			targetUser.address
		);

		if (userNativeTokenBalance.isZero()) {
			if (
				await confirm(
					`>UserId[${targetUser.id}]:${targetUser.address}はガス代用のネイティブトークンを所有していません。ガス代を送金しますか？`
				)
			) {
				tx = {
					chainId: chainId,
					data: "",
					gasLimit: ethers.BigNumber.from("300000"),
					nonce: await provider.getTransactionCount(
						adminAddress,
						"pending"
					),
					type: 2,
					to: targetUser.address,
					value: ethers.utils.parseEther("0.001"),
				};
				await signAndSendTransaction(
					tx,
					signer,
					provider,
					adminPath,
					"ガス代の送金"
				);
			} else {
				console.info("> ガス代送金の処理が拒否されました。");
				exit();
			}
		}

		let iface: ethers.utils.Interface = new ethers.utils.Interface([
			"function approve(address spender, uint256 amount)",
			"function transferFrom(address sender, address recipient, uint256 amount)",
		]);
		let functionData: string;

		const allowance = await jpycV1Contract.allowance(
			targetUser.address,
			adminAddress
		);

		if (allowance.isZero()) {
			if (
				await confirm(
					`> ${targetUser.address}のJPYCは管理者アドレスにAPPROVEされていません。APPROVEを行いますか？`
				)
			) {
				functionData = iface.encodeFunctionData("approve", [
					adminAddress,
					ethers.utils.parseUnits("10000000", 18),
				]);

				tx = {
					chainId: chainId,
					data: functionData,
					gasLimit: ethers.BigNumber.from("300000"),
					nonce: await provider.getTransactionCount(
						targetUser.address,
						"pending"
					),
					type: 2,
					to: contractAddress,
				};

				await signAndSendTransaction(
					tx,
					signer,
					provider,
					userPath,
					"APPROVE"
				);
			} else {
				console.info("> APPROVEの処理が拒否されました。");
				exit();
			}
		}

		const balance = await jpycV1Contract.balanceOf(targetUser.address);

		if (
			await confirm(
				`UserId[${targetUser.id}](${
					targetUser.address
				})に${ethers.utils.formatUnits(
					ethers.BigNumber.from(balance),
					18
				)}JPYCあります。回収作業を行いますか？送り先アドレス:${adminAddress}`
			)
		) {
			functionData = iface.encodeFunctionData("transferFrom", [
				targetUser.address,
				adminAddress,
				balance,
			]);

			tx = {
				chainId: chainId,
				data: functionData,
				gasLimit: ethers.BigNumber.from("300000"),
				nonce: await provider.getTransactionCount(
					adminAddress,
					"pending"
				),
				type: 2,
				to: contractAddress,
				value: "",
			};

			await signAndSendTransaction(
				tx,
				signer,
				provider,
				adminPath,
				"JPYCの回収"
			);
		} else {
			console.info("> JPYCの回収の処理が拒否されました。");
			exit();
		}
	}
};

const signAndSendTransaction = async (
	tx: ethers.providers.TransactionRequest,
	signer: LedgerSigner,
	provider: ethers.providers.AlchemyProvider,
	path: string,
	message: string
) => {
	let sendTx: ethers.providers.TransactionResponse;
	console.info("> Ledger でトランザクションに署名してください");
	try {
		const populateTx = await signer.populateTransaction(tx);
		const signedTx = await signer.signTransaction(populateTx, path);
		sendTx = await provider.sendTransaction(signedTx);
	} catch (err) {
		console.error(err);
		console.info("> 処理に失敗しました、処理しなおしてください");

		exit();
	}

	console.info(`> ${explorerUrl}/tx/${sendTx.hash}`);

	const result = await sendTx.wait(3);
	if (!result.status) {
		console.info(result);
		console.info("> 処理に失敗しました、処理しなおしてください");
		exit();
	}
	console.info("> トランザクションがネットワークに承認されました");
	console.info(`>${message}完了`);
	console.info("------------------");
};

const confirm = async (message: string) => {
	const answer = await (await question(`> ${message} (y/n/e): `))
		.trim()
		.toLowerCase();

	if (answer !== "y" && answer !== "n") {
		console.info("------------------");

		console.info(
			"> プロセスを終了します。気が向いたときに再開してください"
		);
		exit();
	}

	return answer === "y";
};

const question = (question: string): Promise<string> => {
	const readlineInterface = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		readlineInterface.question(question, (answer) => {
			resolve(answer);
			readlineInterface.close();
		});
	});
};

main();
