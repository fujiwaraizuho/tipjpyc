import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { DepositQueue } from "./DepositQueue";
import { Transaction } from "./Transaction";

export enum NetworkType {
	RINKEBY = "RINKEBY",
	POLYGON = "POLYGON",
	MUMBAI = "MUMBAI",
}

@Entity()
export class DepositHistory extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "bigint",
	})
	deposit_queue_id: number;

	@Column({
		type: "bigint",
	})
	transaction_id: number;

	@Column({
		type: "varchar",
		unique: true,
	})
	txid: string;

	@Column({
		type: "int",
	})
	amount: number;

	@Column({
		type: "enum",
		enum: NetworkType,
	})
	network_type: NetworkType;

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@OneToOne(() => Transaction, (transaction) => transaction.depositHistory)
	@JoinColumn([{ name: "transaction_id", referencedColumnName: "id" }])
	transaction: Transaction;

	@OneToOne(() => DepositQueue, (depositQueue) => depositQueue.depositHistory)
	@JoinColumn([{ name: "deposit_queue_id", referencedColumnName: "id" }])
	depositQueue: DepositQueue;
}
