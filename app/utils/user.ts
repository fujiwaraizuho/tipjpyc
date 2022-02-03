import { CommandType, Transaction } from "../../database/entity/Transaction";
import { User } from "../../database/entity/User";
import { getDepositAddress } from "./ethers";

export const getUser = async (twitterId: string) => {
	let user = await User.findOne({
		twitter_id: twitterId,
	});

	if (user === undefined) {
		user = await createUser(twitterId);
	}

	return user;
};

export const createUser = async (twitterId: string) => {
	const user = new User();
	user.twitter_id = twitterId;
	await user.save();

	// 生成された一意な ID を用いて入金用アドレスを生成
	user.address = getDepositAddress(user.id);
	await user.save();

	const transaction = new Transaction();

	transaction.user_id = user.id;
	transaction.amount = 0;
	transaction.command_type = CommandType.OTHER;

	await transaction.save();

	return user;
};
