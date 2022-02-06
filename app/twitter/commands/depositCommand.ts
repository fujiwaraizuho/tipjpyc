import { TweetV2, TwitterApi, UserV2 } from "twitter-api-v2";
import { SettingFlag } from "../../../database/entity/SettingFlag";
import { getLogger } from "../../utils/logger";
import { canDepositCommand } from "../../utils/permission";
import { getUser } from "../../utils/user";

const logger = getLogger();

const exec = async (execUser: UserV2, tweet: TweetV2, client: TwitterApi) => {
	logger.info(`-> Get deposit address of ${execUser.username}`);

	const user = await getUser(execUser.id);

	if (!(await canDepositCommand(user))) {
		await client.v2.reply(
			"このコマンドは管理者によって制限されています。\nご不明な点があれば DM までご連絡ください。",
			tweet.id
		);
		return;
	}

	logger.info(`-> ${execUser.username} = ${user.address}`);

	await client.v2.reply(
		[
			`${user.address} にJPYCを送金してください!`,
			`${user.address} にJPYCを送金してほしいな!`,
		][Math.floor(Math.random() * 2)],
		tweet.id
	);
};

export default exec;
