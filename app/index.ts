import { exit } from "process";
import TwitterAPI, { ETwitterStreamEvent } from "twitter-api-v2";
import { getConfig } from "./utils/config";
import { danger } from "./utils/discord";
import { getLogger } from "./utils/logger";

const main = async () => {
	const logger = getLogger();

	logger.info("-- Welcome to tipJPYC BOT! --");

	const apiKey = getConfig("TWITTER_API_KEY");
	const client = new TwitterAPI(apiKey).readOnly;

	const stream = await client.v2.searchStream({
		autoConnect: false,
		expansions: ["author_id"],
		"tweet.fields": ["author_id", "text", "source"],
		"user.fields": ["username", "name", "created_at"],
	});

	stream.on(ETwitterStreamEvent.Connected, () => {
		logger.info("Connected TwitterStream API...");
	});

	stream.on(ETwitterStreamEvent.Data, (eventData) => {
		/*
			{
  				author_id: '704103618413072384',
  				id: '1488198899492098052',
  				source: 'Twitter Web App',
  				text: '@luco_inc say @azu_luco うっほほ？？？'
			}
		*/
		console.log(eventData.data);
		/*
			[
  				{
    				id: '704103618413072384',
    				name: 'ふじしゃん',
    				username: 'fujiwaraizuho'
  				},
  				{ id: '1183070855850364929', name: 'luco', username: 'luco_inc' },
  				{ id: '996156259819646976', name: 'あず㌠', username: 'azu_luco' }
			]
		*/
		console.log(eventData.includes.users);
	});

	stream.on(ETwitterStreamEvent.Error, () => {
		logger.error("TwitterStream API Connection Error!");

		danger(
			"Twitter Streaming API ERROR!",
			"ツイートの取得に問題が発生しました１"
		);

		exit();
	});

	await stream.connect({
		autoReconnect: true,
		autoReconnectRetries: Infinity,
	});

	logger.info("BOT Ready!");
};

main();
