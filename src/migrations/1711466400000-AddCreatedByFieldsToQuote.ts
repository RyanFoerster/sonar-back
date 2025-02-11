import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByFieldsToQuote1711466400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quote"
      ADD COLUMN IF NOT EXISTS "created_by" character varying DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "created_by_mail" character varying DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "created_by_phone" character varying DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quote"
      DROP COLUMN IF EXISTS "created_by",
      DROP COLUMN IF EXISTS "created_by_mail",
      DROP COLUMN IF EXISTS "created_by_phone"
    `);
  }
}
