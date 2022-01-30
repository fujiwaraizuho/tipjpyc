import DiscordWebhook from "discord-webhook-ts";
import { getConfig } from "./config";

const client = new DiscordWebhook(getConfig("DISCORD_WEBHOOK_URL"));
const prefix = getConfig("DISCORD_LOG_PREFIX");

export const log = (message: string) => {
	try {
		client.execute({
			content: `[${prefix}] ${message}`,
		});
	} catch (err) {
		//
	}
};

export const info = (title: string, message: string) => {
	try {
		client.execute({
			embeds: [
				{
					title: title,
					description: message,
					color: 0x20c033,
				},
			],
		});
	} catch (err) {
		//
	}
};

export const warning = (title: string, message: string) => {
	try {
		client.execute({
			embeds: [
				{
					title: title,
					description: message,
					color: 0xc0ba20,
				},
			],
		});
	} catch (err) {
		//
	}
};

export const danger = (title: string, message: string) => {
	try {
		client.execute({
			embeds: [
				{
					title: title,
					description: message,
					color: 0xc02020,
				},
			],
		});
	} catch (err) {
		//
	}
};
