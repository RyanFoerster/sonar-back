import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceColumnsToVirementSepa1733832994233
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "virement_sepa" 
            ADD COLUMN IF NOT EXISTS "invoice_url" character varying,
            ADD COLUMN IF NOT EXISTS "invoice_key" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "virement_sepa" 
            DROP COLUMN IF EXISTS "invoice_url",
            DROP COLUMN IF EXISTS "invoice_key"
        `);
  }
}
