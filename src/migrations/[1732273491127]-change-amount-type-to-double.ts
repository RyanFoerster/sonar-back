import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAmountTypeToDouble1732273491127
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnType = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transaction' 
      AND column_name = 'amount'
    `);

    if (columnType[0]?.data_type !== 'double precision') {
      await queryRunner.query(`
        ALTER TABLE "transaction" 
        ALTER COLUMN "amount" TYPE double precision
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnType = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transaction' 
      AND column_name = 'amount'
    `);

    if (columnType[0]?.data_type === 'double precision') {
      await queryRunner.query(`
        ALTER TABLE "transaction" 
        ALTER COLUMN "amount" TYPE integer
      `);
    }
  }
}
