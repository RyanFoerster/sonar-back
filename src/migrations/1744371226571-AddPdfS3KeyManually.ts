import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPdfS3KeyManually1744371226571 implements MigrationInterface {
  name = "AddPdfS3KeyManually1744371226571";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice" ADD "pdfS3Key" character varying`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "pdfS3Key"`);
  }
}
