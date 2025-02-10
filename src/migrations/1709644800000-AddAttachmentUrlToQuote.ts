import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentUrlToQuote1709644800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN "attachment_url" character varying DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quote" DROP COLUMN "attachment_url"`);
  }
}
