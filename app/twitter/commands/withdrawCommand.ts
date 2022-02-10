import { ethers } from "ethers";
import { TweetV2, TwitterApi, UserV2 } from "twitter-api-v2";
import { getConnection } from "typeorm";
import { cmdRegExps } from "../..";
import { CommandType, Transaction } from "../../../database/entity/Transaction";
import {
	NetworkType,
	WithdrawRequest,
} from "../../../database/entity/WithdrawRequest";
import { danger, info } from "../../utils/discord";
import { getLogger } from "../../utils/logger";
import { canWithdrawRequestCommand } from "../../utils/permission";
import { getUser } from "../../utils/user";

const logger = getLogger();

const exec = async (
	message: string,
	execUser: UserV2,
	tweet: TweetV2,
	client: TwitterApi
) => {
	const user = await getUser(execUser.id);

	if (!(await canWithdrawRequestCommand(user))) {
		await client.v2.reply(
			"このコマンドは管理者によって制限されています。\nご不明な点があれば DM までご連絡ください。",
			tweet.id
		);

		logger.info("-> permission error");
		return;
	}

	const { amount, address } = message.match(cmdRegExps.withdraw).groups;
	const tax = 0;

	if (!Number.isSafeInteger(Number(amount))) {
		await client.v2.reply(
			`申し訳ありません!\n出金額が正の整数でないか不正です。`,
			tweet.id
		);

		logger.info("-> invalid amount");
		return;
	}

	if (!ethers.utils.isAddress(address)) {
		await client.v2.reply(
			"申し訳ありません!\n出金アドレスが不正です。",
			tweet.id
		);

		logger.info("-> invalid address");
		return;
	}

	logger.info(
		`-> WithdrawRequest ${amount}JPYC + ${tax}JPYC from @${execUser.username} to ${address}`
	);

	const queryRunner = getConnection().createQueryRunner();

	await queryRunner.connect();
	await queryRunner.startTransaction();

	try {
		const { balance } = await queryRunner.manager
			.getRepository(Transaction)
			.createQueryBuilder("transaction")
			.select("SUM(transaction.amount)", "balance")
			.where("transaction.user_id = :user_id", {
				user_id: user.id,
			})
			.setLock("pessimistic_write")
			.getRawOne<{ balance: number }>();

		if (balance < Number.parseInt(amount)) {
			await client.v2.reply(
				`ごめんなさい、残高が足りないみたいです。(現在の残高: ${balance}JPYC)`,
				tweet.id
			);

			logger.info(`-> Not enough JPYC. ${balance} < ${amount} + ${tax}`);
			return;
		}

		const transaction = new Transaction();

		transaction.user_id = user.id;
		transaction.tweet_id = tweet.id;
		transaction.amount = -Number.parseInt(amount);
		transaction.command_type = CommandType.WITHDRAW;

		await queryRunner.manager.save(Transaction, transaction);

		const withdrawRequest = new WithdrawRequest();

		withdrawRequest.transaction_id = transaction.id;
		withdrawRequest.address = address;
		withdrawRequest.amount = Number.parseInt(amount);
		withdrawRequest.tax = tax;
		withdrawRequest.network_type = NetworkType.POLYGON;

		await queryRunner.manager.save(WithdrawRequest, withdrawRequest);

		await queryRunner.commitTransaction();
	} catch (err) {
		await queryRunner.rollbackTransaction();

		logger.error(err);
		await danger("Process Error!", JSON.stringify(err));

		await client.v2.reply(
			"ごめんなさい、出金リクエストに失敗しました…\nしばらく待ってからやり直してみてください!",
			tweet.id
		);

		return;
	} finally {
		await queryRunner.release();
	}

	logger.info("-> Withdraw requested");

	await info(
		"出金リクエストを受け付けました",
		`From: ${execUser.name}(@${execUser.username})\nAmount: ${amount}JPYC\nTax: ${tax}JPYC\nAddress: ${address}`,
		`https://twitter.com/_/status/${tweet.id}`
	);

	await client.v2.reply(
		`${amount} JPYCの出金リクエストを受け付けました!\n出金には数日かかる場合があります、出金完了時には再度返信いたしますのでお待ち下さい。`,
		tweet.id
	);
};

export default exec;
