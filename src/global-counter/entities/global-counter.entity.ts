import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GlobalCounter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 1 })
  next_invoice_number: number;

  @Column({ default: 1 })
  next_quote_number: number;

  @Column({ default: 'MAIN' })
  type: string;
}
