import TwitterAPI, { ETwitterStreamEvent } from "twitter-api-v2";
import { getConfig } from "./utils/config";

const main = async () => {
	const apiKey = getConfig("TWITTER_API_KEY");
	const client = new TwitterAPI(apiKey).readOnly;

	const stream = await client.v2.searchStream({
		autoConnect: false,
		expansions: ["author_id"],
		"tweet.fields": ["author_id", "text", "source"],
		"user.fields": ["username", "name", "created_at"],
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

	await stream.connect({
		autoReconnect: true,
		autoReconnectRetries: Infinity,
	});
};

main();
