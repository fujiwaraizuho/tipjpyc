import { exit } from "process";
import { getConfig } from "../../app/utils/config";
import { danger } from "../../app/utils/discord";
import { getLogger } from "../../app/utils/logger";
import TwitterAPI from "twitter-api-v2";

const logger = getLogger();

const main = async () => {
	logger.info("--- Start to Check Stream API ---");

	const client = new TwitterAPI({
		appKey: getConfig("TEST_TWITTER_APP_KEY"),
		appSecret: getConfig("TEST_TWITTER_APP_SECRET"),
		accessToken: getConfig("TEST_TWITTER_ACCESS_TOKEN"),
		accessSecret: getConfig("TEST_TWITTER_ACCESS_SECRET"),
	});

	const { data: testAccount } = await client.v2.me();
	logger.info(`UserName: $${testAccount.username}, ID: ${testAccount.id}`);

	const mainText = [
		"おーい",
		"はろー",
		"てすてす",
		"やっほー",
		"現状報告お願いします。オーバー",
	];
	const mainTextNumber = Math.floor(Math.random() * mainText.length);

	let subtext = "";
	let subTextElement = "abcdefghijklmnopqrstuvwxyz0123456789";

	for (let i = 0; i < 5; i++) {
		subtext +=
			subTextElement[Math.floor(Math.random() * subTextElement.length)];
	}

	const tweetText = `@tipjpyc balance\n${mainText[mainTextNumber]} ${subtext}`;

	try {
		const { data: createdTweet } = await client.v2.tweet(tweetText);
		logger.info(`Tweeted: ${createdTweet.text}, ID: ${createdTweet.id}`);

		logger.info(`-> Waiting 60 seconds`);
		await wait(60);

		const { data: mentionedTweetsToTestAccount } =
			await client.v2.userMentionTimeline(testAccount.id, {
				max_results: 10,
				expansions: ["referenced_tweets.id", "author_id"],
			});

		logger.info(`-> Fetched Mentioned Tweets`);

		for (let t = 0; t < mentionedTweetsToTestAccount.data.length; t++) {
			const mentionedTweet = mentionedTweetsToTestAccount.data[t];
			const isReplayed =
				createdTweet.id === mentionedTweet.referenced_tweets[0].id;
			const isTipJPYCAccount = mentionedTweet.author_id;

			if (isReplayed && isTipJPYCAccount) {
				logger.info(
					`Replayed Tweet: ${mentionedTweet.text}, ID: ${mentionedTweet.id}`
				);
				logger.info(
					`TweetID and UserID are matched. Stream API is correctly working`
				);
				exit(0);
			}
		}

		logger.error("Could not found any reply from TipJPYC");
		await danger(
			"Could not found any reply from TipJPYC!",
			"Please check manually."
		);
		exit();
	} catch (err) {
		logger.error(err);
		logger.error("Check Stream Error!");
		await danger("Database Connection ERROR!", JSON.stringify(err));
		exit();
	}
};

const wait = async (seconds: number) => {
	const milliseconds = seconds * 1000;
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

main();
