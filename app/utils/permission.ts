import { SettingFlag } from "../../database/entity/SettingFlag";
import { User, UserStatus } from "../../database/entity/User";

export const canDepositCommand = async (user: User) => {
	const settingFlag = await SettingFlag.findOne({
		order: {
			createdAt: "DESC",
		},
	});

	if (settingFlag === undefined || !settingFlag.deposit) return false;

	if (
		user.status === UserStatus.SUSPEND_IN ||
		user.status === UserStatus.LOCKED
	) {
		return false;
	}

	return true;
};

export const canDepositListener = async () => {
	const settingFlag = await SettingFlag.findOne({
		order: {
			createdAt: "DESC",
		},
	});

	if (settingFlag === undefined) {
		return false;
	}

	return settingFlag.depositListener;
};

export const canBalanceCommand = async (user: User) => {
	const settingFlag = await SettingFlag.findOne({
		order: {
			createdAt: "DESC",
		},
	});

	if (settingFlag === undefined || !settingFlag.balance) return false;

	if (user.status === UserStatus.LOCKED) {
		return false;
	}

	return true;
};

export const canWithdrawRequestCommand = async (user: User) => {
	const settingFlag = await SettingFlag.findOne({
		order: {
			createdAt: "DESC",
		},
	});

	if (settingFlag === undefined || !settingFlag.withdrawRequest) return false;

	if (
		user.status === UserStatus.SUSPEND_OUT ||
		user.status === UserStatus.LOCKED
	) {
		return false;
	}

	return true;
};

export const canTipCommand = async (user: User) => {
	const settingFlag = await SettingFlag.findOne({
		order: {
			createdAt: "DESC",
		},
	});

	if (settingFlag === undefined || !settingFlag.tip) return false;

	if (
		user.status === UserStatus.SUSPEND_OUT ||
		user.status === UserStatus.LOCKED
	) {
		return false;
	}

	return true;
};
