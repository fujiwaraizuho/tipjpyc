import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { DepositHistory } from "./DepositHistory";
import { User } from "./User";

export enum DepositQueueStatus {
	UNCONFIRM = "UNCONFIRM",
	CONFIRMED = "CONFIRMED",
	REJECT = "REJECT",
}

export enum NetworkType {
	RINKEBY = "RINKEBY",
	POLYGON = "POLYGON",
	MUMBAI = "MUMBAI",
}

@Entity()
export class DepositQueue extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "bigint",
	})
	user_id: number;

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

	@Column({
		type: "enum",
		enum: DepositQueueStatus,
		default: DepositQueueStatus.UNCONFIRM,
	})
	status: DepositQueueStatus;

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@ManyToOne(() => User, (user) => user.depositQueues)
	@JoinColumn([
		{
			name: "user_id",
			referencedColumnName: "id",
		},
	])
	user: User;

	@OneToOne(
		() => DepositHistory,
		(depositHistory) => depositHistory.depositQueue
	)
	depositHistory: DepositHistory;
}
