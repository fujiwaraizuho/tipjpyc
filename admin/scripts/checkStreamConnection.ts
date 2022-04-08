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
	console.log(testAccount);

	const mainText = [
		"おーい",
		"はろー",
		"てすてす",
		"ケロケロ",
		"現状報告を！オーバー",
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
		// const { data: createdTweet } = await client.v2.tweet(tweetText);
		const createdTweet = { id: "1512334092477472770" };
		console.log(`-> Tweeted: ${createdTweet}`);
		// logger.info(`-> Tweeted: ${createdTweet}`);

		await wait(5);

		const { data: mentionedTweetsToTestAccount } =
			await client.v2.userMentionTimeline(testAccount.id, {
				max_results: 10,
				expansions: ["referenced_tweets.id", "author_id"],
			});

		console.log(mentionedTweetsToTestAccount);
		// logger.info(`-> Get Mentioned Tweets`);

		for (let t = 0; t < mentionedTweetsToTestAccount.data.length; t++) {
			const isReplayed =
				createdTweet.id ===
				mentionedTweetsToTestAccount.data[t].referenced_tweets[0].id;
			const isTipJPYCAccount =
				mentionedTweetsToTestAccount.data[t].author_id;

			if (isReplayed && isTipJPYCAccount) {
				logger.info(
					`-> TweetID and UserID are matched. Stream API is correctly working`
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
