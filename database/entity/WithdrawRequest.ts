import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { Transaction } from "./Transaction";

export enum NetworkType {
	MAINNET = "MAINNNET",
	POLYGON = "POLYGON",
}

export enum WithdrawStatus {
	UNCOMPLETED = "UNCOMPLETED",
	LOCKING = "LOCKING",
	ACCEPT = "ACCEPT",
	REJECT = "REJECT",
	FAILED = "FAILED",
}

@Entity()
export class WithdrawRequest extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "bigint",
	})
	transaction_id: number;

	@Column({
		type: "varchar",
	})
	@Index()
	address: string;

	@Column({
		type: "int",
	})
	amount: number;

	@Column({
		type: "enum",
		enum: NetworkType,
	})
	network_type: NetworkType;

	@Column({
		type: "enum",
		enum: WithdrawStatus,
		default: WithdrawStatus.UNCOMPLETED,
	})
	status: WithdrawStatus;

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@OneToOne(() => Transaction, (transaction) => transaction.withdrawRequest)
	@JoinColumn([{ name: "transaction_id", referencedColumnName: "id" }])
	transaction: Transaction;
}
