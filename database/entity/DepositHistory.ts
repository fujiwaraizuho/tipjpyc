import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { Transaction } from "./Transaction";

export enum NetworkType {
	MAINNET = "MAINNNET",
	POLYGON = "POLYGON",
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
}
