import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsInfoPendingToClient1745841904732
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client" ADD COLUMN "is_info_pending" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "client"."is_info_pending" IS 'Indicates if client information needs to be filled by the client'`,
    ); // Optionnel, dépend de la DB
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `COMMENT ON COLUMN "client"."is_info_pending" IS NULL`,
    ); // Optionnel, dépend de la DB
    await queryRunner.query(
      `ALTER TABLE "client" DROP COLUMN "is_info_pending"`,
    );
  }
}
