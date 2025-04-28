import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientInfoRequiredToQuote1745841929184
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN "client_info_required" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "quote"."client_info_required" IS 'Indicates if client information must be provided via the quote decision page'`,
    ); // Optionnel, dépend de la DB
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `COMMENT ON COLUMN "quote"."client_info_required" IS NULL`,
    ); // Optionnel, dépend de la DB
    await queryRunner.query(
      `ALTER TABLE "quote" DROP COLUMN "client_info_required"`,
    );
  }
}
