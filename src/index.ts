import { CronJob } from "cron";

/* Job is BUSY? */
let isBusy = false;

const main = async () => {
	//
};

const job = new CronJob("*/15 * * * * *", async () => {
	if (isBusy) {
		return;
	}

	isBusy = true;

	await main();

	isBusy = false;
});

job.start();
