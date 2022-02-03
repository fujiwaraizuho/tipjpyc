import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { DepositHistory } from "./DepositHistory";
import { User } from "./User";
import { WithdrawRequest } from "./WithdrawRequest";

export enum CommandType {
	DEPOSIT = "DEPOSIT",
	WITHDRAW = "WITHDRAW",
	TIP = "TIP",
	BALANCE = "BALANCE",
	OTHER = "OTHER",
}

@Entity()
export class Transaction extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "bigint",
	})
	user_id: number;

	@Column({
		type: "bigint",
		nullable: true,
	})
	tx_user_id: number | null;

	@Column({
		type: "varchar",
		nullable: true,
	})
	tweet_id: string;

	@Column({
		type: "int",
	})
	amount: number;

	@Column({
		type: "enum",
		enum: CommandType,
	})
	command_type: CommandType;

	@Column({
		type: "text",
		nullable: true,
	})
	description: string | null;

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@UpdateDateColumn({
		name: "updated_at",
	})
	updatedAt: Date;

	@ManyToOne(() => User, (user) => user.transactions)
	@JoinColumn([
		{
			name: "user_id",
			referencedColumnName: "id",
		},
	])
	user: User;

	@ManyToOne(() => User, (user) => user.transactions)
	@JoinColumn([
		{
			name: "tx_user_id",
			referencedColumnName: "id",
		},
	])
	txUser: User;

	@OneToOne(
		() => WithdrawRequest,
		(withdrawRequest) => withdrawRequest.transaction
	)
	withdrawRequest: WithdrawRequest;

	@OneToOne(
		() => DepositHistory,
		(depositHistory) => depositHistory.transaction
	)
	depositHistory: DepositHistory;
}
