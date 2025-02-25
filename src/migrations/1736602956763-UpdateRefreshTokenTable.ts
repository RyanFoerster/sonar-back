import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRefreshTokenTable1736602956763
  implements MigrationInterface
{
  name = 'UpdateRefreshTokenTable1736602956763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérification de l'existence des colonnes
    const hasCreatedAt = await queryRunner.hasColumn(
      'refresh_token',
      'created_at',
    );
    const hasRevoked = await queryRunner.hasColumn('refresh_token', 'revoked');
    const hasRevokedAt = await queryRunner.hasColumn(
      'refresh_token',
      'revoked_at',
    );

    if (!hasCreatedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
      );
    }

    if (!hasRevoked) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "revoked" BOOLEAN NOT NULL DEFAULT false`,
      );
    }

    if (!hasRevokedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "revoked_at" TIMESTAMP`,
      );
    }

    // Vérification de l'existence des index
    const tokenIndexExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_refresh_token_token'
      )`,
    );

    const userIdIndexExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_refresh_token_userId'
      )`,
    );

    if (!tokenIndexExists[0].exists) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_refresh_token_token" ON "refresh_token" ("token")`,
      );
    }

    if (!userIdIndexExists[0].exists) {
      await queryRunner.query(
        `CREATE INDEX "IDX_refresh_token_userId" ON "refresh_token" ("userId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_token"`);

    // Suppression des colonnes
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN IF EXISTS "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN IF EXISTS "revoked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN IF EXISTS "created_at"`,
    );
  }
}
