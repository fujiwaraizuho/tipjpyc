import { exit } from "process";
import { createInterface } from "readline";
import { createConnection } from "typeorm";
import { danger } from "../../app/utils/discord";
import { WithdrawRequest } from "../../database/entity/WithdrawRequest";

const main = async () => {
	console.info("--- Welcome to tipJPYC Withdraw Signer! ---");

	try {
		console.info("-> Try connection database...");
		await createConnection();
	} catch (err) {
		console.error("Database Connection Error!");
		danger("Database Connection ERROR!", JSON.stringify(err));
		exit();
	}

	console.info("------------------");

	for (;;) {
		// WithdrawRequest から UNCOMPLETED の行を1つとってきてステータスを LOCKED に変更

		console.info("------------------");

		if (await confirm("この出金リクエストを承認しますか？")) {
			console.info("------------------");
			// 出金処理を行ってステータスを ACCEPT に変更 (失敗したら FAILED に変更)
		} else {
			console.info("------------------");
			// ステータスを REJECT に変更する
		}
	}
};

const confirm = async (message: string, withdrawRequest?: WithdrawRequest) => {
	const answer = await question(`> ${message} (y/n/e): `);

	if (answer.trim().toLowerCase() === "e") {
		console.info("------------------");
		console.info("> 終了処理を行います");
		// 渡された WithdrawRequest のステータスを PROCESSING から UNCOMPLETE に戻す
		console.info("> 終了処理が完了しました");
		exit();
	}

	return answer.trim().toLowerCase() === "y";
};

const question = (question: string): Promise<string> => {
	const readlineInterface = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		readlineInterface.question(question, (answer) => {
			resolve(answer);
			readlineInterface.close();
		});
	});
};

main();
