import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity()
export class SettingFlag extends BaseEntity {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column({
		type: "bool",
		default: true,
	})
	deposit: boolean;

	@Column({
		type: "bool",
		default: true,
	})
	withdrawRequest: boolean;

	@Column({
		type: "bool",
		default: true,
	})
	tip: true;

	@Column({
		type: "bool",
		default: true,
	})
	balance: true;

	@Column({
		type: "bool",
		default: true,
	})
	depositListener: true;

	@Column({
		type: "text",
	})
	reason: string;

	@Column({
		type: "varchar",
	})
	execAdmin: string;

	@CreateDateColumn({
		name: "created_at",
	})
	createdAt: Date;

	@UpdateDateColumn({
		name: "updated_at",
	})
	updatedAt: Date;
}
