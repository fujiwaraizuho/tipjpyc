import TwitterAPI, { ETwitterStreamEvent } from "twitter-api-v2";
import { getConfig } from "./utils/config";
import { danger } from "./utils/discord";
import { getLogger } from "./utils/logger";

import tipCommand from "./twitter/commands/tipCommand";
import depositCommand from "./twitter/commands/depositCommand";
import balanceCommand from "./twitter/commands/balanceCommand";
import withdrawCommand from "./twitter/commands/withdrawCommand";

/* eslint-disable no-irregular-whitespace */
/* 正規表現に全角空白を含む必要があるため */
const cmdRegExps = {
	tip: /(tip)( |　)+(?<to>@([A-z0-9_]+))( |　)+(?<amount>([1-9]\d*|0))(\.\d+)?/,
	deposit: /(deposit)/,
	balance: /(balance)/,
	withdraw:
		/(withdraw)( |　)+((?<amount>([1-9]\d*|0))(\.\d+)?)( |　)+(?<address>0x[a-fA-F0-9]{40})?/,
};

const main = async () => {
	const logger = getLogger();

	logger.info("--- Welcome to tipJPYC BOT! ---");

	const apiKey = getConfig("TWITTER_API_KEY");
	const client = new TwitterAPI(apiKey).readOnly;

	const stream = await client.v2.searchStream({
		autoConnect: false,
		expansions: ["author_id"],
		"tweet.fields": ["author_id", "text", "source"],
		"user.fields": ["username", "name", "created_at"],
	});

	stream.on(ETwitterStreamEvent.Connected, () => {
		logger.info("-> connected to twitter stream");
	});

	stream.on(ETwitterStreamEvent.Data, (eventData) => {
		const { data } = eventData;
		const { users } = eventData.includes;

		logger.info(`-> catch tweet ${data.id}`);

		switch (true) {
			case cmdRegExps.tip.test(data.text):
				tipCommand();
				break;

			case cmdRegExps.balance.test(data.text):
				balanceCommand();
				break;

			case cmdRegExps.deposit.test(data.text):
				depositCommand();
				break;

			case cmdRegExps.withdraw.test(data.text):
				withdrawCommand();
				break;
		}

		logger.info(`-> process finished ${data.id}`);
	});

	stream.on(ETwitterStreamEvent.ReconnectAttempt, () => {
		logger.info("-> retry to connect to twitter stream");
	});

	stream.on(ETwitterStreamEvent.Error, (payload) => {
		logger.error("TwitterStream API Connection Error!");
		danger("Twitter Streaming API ERROR!", JSON.stringify(payload));
	});

	await stream.connect({
		autoReconnect: true,
		autoReconnectRetries: Infinity,
	});

	logger.info("-> tipJPYC setup is finished!");
};

main();
