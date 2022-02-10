import { TweetV2, TwitterApi, UserV2 } from "twitter-api-v2";
import { getRepository } from "typeorm";
import { getLogger } from "../../utils/logger";
import { canBalanceCommand } from "../../utils/permission";
import { getUser } from "../../utils/user";
import { Transaction } from "../../../database/entity/Transaction";
import {
	DepositQueue,
	DepositQueueStatus,
} from "../../../database/entity/DepositQueue";

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

	let { unconfirmBalance } = await getRepository(DepositQueue)
		.createQueryBuilder("depositQueue")
		.select("SUM(depositQueue.amount)", "unconfirmBalance")
		.where("depositQueue.user_id = :user_id", {
			user_id: user.id,
		})
		.andWhere("depositQueue.status = :status", {
			status: DepositQueueStatus.UNCONFIRM,
		})
		.getRawOne<{ unconfirmBalance: number }>();

	if (unconfirmBalance === null) {
		unconfirmBalance = 0;
	}

	logger.info(`-> ${balance}JPYC (uncofirm: ${unconfirmBalance}JPYC)`);

	await client.v2.reply(
		[
			`残高は ${balance} JPYCです! (承認待ち: ${unconfirmBalance} JPYC)`,
			`残高は ${balance} JPYCですっ! (承認待ち: ${unconfirmBalance} JPYC)`,
		][Math.floor(Math.random() * 2)],
		tweet.id
	);
};

export default exec;
