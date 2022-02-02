import { TweetV2, TwitterApi, UserV2 } from "twitter-api-v2";
import { getLogger } from "../../utils/logger";
import { getUser } from "../../utils/user";

const logger = getLogger();

const exec = async (execUser: UserV2, tweet: TweetV2, client: TwitterApi) => {
	logger.info(`-> Get deposit address of ${execUser.username}`);

	const user = await getUser(execUser.id);

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
