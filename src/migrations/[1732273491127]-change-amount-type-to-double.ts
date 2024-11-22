import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAmountTypeToDouble1732273491127
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction" 
            ALTER COLUMN "amount" TYPE double precision
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction" 
            ALTER COLUMN "amount" TYPE integer
        `);
  }
}
