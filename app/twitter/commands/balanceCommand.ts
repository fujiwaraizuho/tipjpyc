import { TweetV2, TwitterApi, UserV2 } from "twitter-api-v2";
import { getRepository } from "typeorm";
import { getLogger } from "../../utils/logger";
import { canBalanceCommand } from "../../utils/permission";
import { getUser } from "../../utils/user";
import { Transaction } from "../../../database/entity/Transaction";

const logger = getLogger();

const exec = async (execUser: UserV2, tweet: TweetV2, client: TwitterApi) => {
	logger.info(`-> Check balance of ${execUser.username}`);

	const user = await getUser(execUser.id);

	if (!(await canBalanceCommand(user))) {
		await client.v2.reply(
			"このコマンドは管理者によって制限されています。\nご不明な点があれば DM までご連絡ください。",
			tweet.id
		);

		logger.info("-> permission error");

		return;
	}

	const { balance } = await getRepository(Transaction)
		.createQueryBuilder("transaction")
		.select("SUM(transaction.amount)", "balance")
		.where("transaction.user_id = :user_id", {
			user_id: user.id,
		})
		.getRawOne<{ balance: number }>();

	logger.info(`-> ${balance}JPYC`);

	await client.v2.reply(
		[`残高は ${balance} JPYCです!`, `残高は ${balance} JPYCですっ!`][
			Math.floor(Math.random() * 2)
		],
		tweet.id
	);
};

export default exec;
