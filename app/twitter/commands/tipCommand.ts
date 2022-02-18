import { TweetV2, TwitterApi, UserV2, UserV2Result } from "twitter-api-v2";
import { getConnection } from "typeorm";
import { cmdRegExps } from "../..";
import { CommandType, Transaction } from "../../../database/entity/Transaction";
import { danger, info } from "../../utils/discord";
import { getLogger } from "../../utils/logger";
import { canTipCommand } from "../../utils/permission";
import { getUser } from "../../utils/user";

const logger = getLogger();

const exec = async (
	message: string,
	execUser: UserV2,
	tweet: TweetV2,
	client: TwitterApi
) => {
	logger.info("-> Sending...");

	const fromUser = await getUser(execUser.id);

	if (!(await canTipCommand(fromUser))) {
		await client.v2.reply(
			"このコマンドは管理者によって制限されています。\nご不明な点があれば DM までご連絡ください。",
			tweet.id
		);

		logger.info("-> permission error");

		return;
	}

	const { to, amount } = message.match(cmdRegExps.tip).groups;

	let toTwitterUser: UserV2Result;

	try {
		toTwitterUser = await client.v2.userByUsername(to.replace(/@?/, ""), {
			"user.fields": ["username", "name", "created_at", "protected"],
		});

		if (toTwitterUser.data.protected) {
			await client.v2.reply(
				"申し訳ありません!\n鍵アカウントに投げ銭はできません。",
				tweet.id
			);

			logger.info("-> protect user");
			return;
		}
	} catch (err) {
		await client.v2.reply(
			`申し訳ありません! ${to} というユーザーは存在しないようです`,
			tweet.id
		);

		logger.info("-> invalid user");
		return;
	}

	if (execUser.id === toTwitterUser.data.id) {
		await client.v2.reply(
			`申し訳ありません! 自分自身には投げ銭できません`,
			tweet.id
		);

		logger.info("-> invalid self user");
		return;
	}

	if (Number(amount) == 0 || !Number.isSafeInteger(Number(amount))) {
		await client.v2.reply(
			`申し訳ありません!\n投げ銭の額が正の整数でないか不正です。`,
			tweet.id
		);

		logger.info("-> invalid amount");
		return;
	}

	logger.info(
		`-> Send ${amount}JPYC from @${execUser.username} to @${toTwitterUser.data.username}`
	);

	const toUser = await getUser(toTwitterUser.data.id);

	const queryRunner = getConnection().createQueryRunner();

	await queryRunner.connect();
	await queryRunner.startTransaction();

	try {
		const { balance } = await queryRunner.manager
			.getRepository(Transaction)
			.createQueryBuilder("transaction")
			.select("SUM(transaction.amount)", "balance")
			.where("transaction.user_id = :user_id", {
				user_id: fromUser.id,
			})
			.setLock("pessimistic_write")
			.getRawOne<{ balance: number }>();

		if (balance < Number.parseInt(amount)) {
			await client.v2.reply(
				`ごめんなさい、残高が足りないみたいです。\nあなたの残高 ${balance} JPYC`,
				tweet.id
			);

			logger.info(`-> Not enough JPYC. ${balance} < ${amount}`);
			return;
		}

		const fromTx = new Transaction();

		fromTx.user_id = fromUser.id;
		fromTx.tx_user_id = toUser.id;
		fromTx.tweet_id = tweet.id;
		fromTx.amount = -Number.parseInt(amount);
		fromTx.command_type = CommandType.TIP_OUT;

		await queryRunner.manager.save(Transaction, fromTx);

		const toTx = new Transaction();

		toTx.user_id = toUser.id;
		toTx.tx_user_id = fromUser.id;
		toTx.tweet_id = tweet.id;
		toTx.amount = Number.parseInt(amount);
		toTx.command_type = CommandType.TIP_IN;

		await queryRunner.manager.save(Transaction, toTx);

		await queryRunner.commitTransaction();
	} catch (err) {
		await queryRunner.rollbackTransaction();

		logger.error(err);
		await danger("Process Error!", JSON.stringify(err));

		await client.v2.reply(
			`ごめんなさい、投げ銭に失敗しました…\nしばらく待ってからやり直してみてください!`,
			tweet.id
		);

		return;
	} finally {
		await queryRunner.release();
	}

	logger.info("-> Sent");

	info(
		"投げ銭が完了しました",
		`Amount: ${amount}JPYC\nFrom: ${execUser.name}(@${execUser.username})\nTo: ${toTwitterUser.data.name}(@${toTwitterUser.data.username})\nMessage: ${message}`,
		`https://twitter.com/_/status/${tweet.id}`
	);

	await client.v2.reply(
		`@${execUser.username} さんから @${toTwitterUser.data.username} さんに ${amount} JPYCの投げ銭です! `,
		tweet.id
	);
};

export default exec;
