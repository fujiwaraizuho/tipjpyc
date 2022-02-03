import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from "typeorm";

import { Transaction } from "./Transaction";
import { WithdrawRequest } from "./WithdrawRequest";

export enum UserStatus {
	ACTIVE = "ACTIVE", // 全サービス提供可能
	SUSPEND_OUT = "SUSPEND_OUT", // withdraw 及び tip を制限
	SUSPEND_IN = "SUSPEND_IN", // deposit を制限
	LOCKED = "LOCKED", // 全コマンドを制限
}

@Entity()
export class User extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "varchar",
		unique: true,
	})
	twitter_id: string;

	@Column({
		type: "varchar",
		unique: true,
		default: null,
	})
	address: string;

	@Column({
		type: "enum",
		enum: UserStatus,
		default: UserStatus.ACTIVE,
	})
	status: UserStatus;

	@OneToMany(() => Transaction, (transaction) => transaction.user)
	transactions: Transaction[];

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@UpdateDateColumn({
		name: "updated_at",
	})
	updatedAt: Date;
}
