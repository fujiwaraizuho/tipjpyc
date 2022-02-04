import TwitterAPI, { ETwitterStreamEvent } from "twitter-api-v2";
import { getConfig } from "./utils/config";
import { danger } from "./utils/discord";
import { getLogger } from "./utils/logger";
import { createConnection } from "typeorm";
import { exit } from "process";
import { Transaction } from "../database/entity/Transaction";

import tipCommand from "./twitter/commands/tipCommand";
import depositCommand from "./twitter/commands/depositCommand";
import balanceCommand from "./twitter/commands/balanceCommand";
import withdrawCommand from "./twitter/commands/withdrawCommand";

import "reflect-metadata";

/* eslint-disable no-irregular-whitespace */
/* 正規表現に全角空白を含む必要があるため */
export const cmdRegExps = {
	tip: /(tip)( |　)+(?<to>@([A-z0-9_]+))( |　)+(?<amount>([1-9]\d*|0))(\.\d+)?/,
	deposit: /(deposit)/,
	balance: /(balance)/,
	withdraw:
		/(withdraw)( |　)+((?<amount>([1-9]\d*|0))(\.\d+)?)( |　)+(?<address>0x[a-fA-F0-9]{40})?/,
};

const main = async () => {
	const logger = getLogger();

	logger.info("--- Welcome to tipJPYC BOT! ---");

	try {
		logger.info("-> Try connection database...");
		await createConnection();
	} catch (err) {
		logger.error("Database Connection Error!");
		danger("Database Connection ERROR!", JSON.stringify(err));
		exit();
	}

	const streamApiKey = getConfig("TWITTER_STREAM_API_KEY");
	const streamClient = new TwitterAPI(streamApiKey).readOnly;

	const rules = await streamClient.v2.streamRules();

	logger.info(`-> Twitter Search [${rules.data[0].value}]`);

	const stream = await streamClient.v2.searchStream({
		autoConnect: false,
		expansions: ["author_id"],
		"tweet.fields": ["author_id", "text", "source"],
		"user.fields": ["username", "name", "created_at", "protected"],
	});

	stream.on(ETwitterStreamEvent.Connected, () => {
		logger.info("-> Connected TwitterStream");
	});

	const client = new TwitterAPI({
		appKey: getConfig("TWITTER_APP_KEY"),
		appSecret: getConfig("TWITTER_APP_SECRET"),
		accessToken: getConfig("TWITTER_ACCESS_TOKEN"),
		accessSecret: getConfig("TWITTER_ACCESS_SECRET"),
	});

	stream.on(ETwitterStreamEvent.Data, async (eventData) => {
		const { data } = eventData;
		const { users } = eventData.includes;

		const execUser = users.find((user) => user.id === data.author_id);

		logger.info(`-> Tweet from ${execUser.username}: ${data.text}`);

		const checkTweet = await Transaction.findOne({
			tweet_id: data.id,
		});

		if (data.text.indexOf("@tipjpyc") === -1 || checkTweet !== undefined) {
			logger.info("-> Ignore tweet");
			return;
		}

		const message = data.text.replace(/@tipjpyc ?/, "");

		logger.info(`-> Message: ${message}`);

		try {
			switch (true) {
				case cmdRegExps.tip.test(message):
					await tipCommand(message, execUser, data, client);
					break;

				case cmdRegExps.balance.test(message):
					await balanceCommand(execUser, data, client);
					break;

				case cmdRegExps.deposit.test(message):
					await depositCommand(execUser, data, client);
					break;

				case cmdRegExps.withdraw.test(message):
					await withdrawCommand();
					break;

				default:
					logger.info("-> no command");
			}
		} catch (err) {
			// エラーが生じたので処理ができなかった旨の返信を返す
			logger.error(err);
			danger("Process Error!", JSON.stringify(err));
		}

		logger.info(`-> Done...`);
	});

	stream.on(ETwitterStreamEvent.ReconnectAttempt, () => {
		logger.info("-> Retry connect TwitterStream");
	});

	stream.on(ETwitterStreamEvent.Error, (payload) => {
		logger.error("TwitterStream API Connection Error!");
		danger("Twitter Streaming API ERROR!", JSON.stringify(payload));
	});

	await stream.connect({
		autoReconnect: true,
		autoReconnectRetries: Infinity,
	});

	logger.info("-> @tipjpyc setup is finished!");
	logger.info("-----");
};

main();
