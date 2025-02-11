import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentUrlToQuote1709644800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='quote' AND column_name='attachment_url'
        ) THEN 
          ALTER TABLE "quote" ADD COLUMN "attachment_url" character varying DEFAULT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='quote' AND column_name='attachment_url'
        ) THEN 
          ALTER TABLE "quote" DROP COLUMN "attachment_url";
        END IF;
      END $$;
    `);
  }
}
