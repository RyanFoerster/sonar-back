import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRefreshTokenTable1736602956763
  implements MigrationInterface
{
  name = 'UpdateRefreshTokenTable1736602956763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajout des nouvelles colonnes
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "revoked" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "revoked_at" TIMESTAMP`,
    );

    // Création des index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refresh_token_token" ON "refresh_token" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_token_userId" ON "refresh_token" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index
    await queryRunner.query(`DROP INDEX "IDX_refresh_token_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_token_token"`);

    // Suppression des colonnes
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "revoked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "created_at"`,
    );
  }
}
