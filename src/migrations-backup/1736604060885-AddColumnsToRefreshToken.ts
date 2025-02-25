import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnsToRefreshToken1736604060885
  implements MigrationInterface
{
  name = 'AddColumnsToRefreshToken1736604060885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérification et suppression des contraintes
    const constraints = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'notification'
      AND constraint_name IN ('FK_notification_group', 'FK_notification_toUser', 'FK_notification_fromUser')
    `);

    for (const constraint of constraints) {
      await queryRunner.query(
        `ALTER TABLE "notification" DROP CONSTRAINT "${constraint.constraint_name}"`,
      );
    }

    // Vérification et suppression des index
    const indexes = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'refresh_token'
      AND indexname IN ('IDX_refresh_token_token', 'IDX_refresh_token_userId')
    `);

    for (const index of indexes) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."${index.indexname}"`,
      );
    }

    // Vérification et modification des colonnes
    const hasCreatedAt = await queryRunner.hasColumn(
      'refresh_token',
      'created_at',
    );
    const hasRevokedAt = await queryRunner.hasColumn(
      'refresh_token',
      'revoked_at',
    );
    const hasCreatedAtNew = await queryRunner.hasColumn(
      'refresh_token',
      'createdAt',
    );
    const hasRevokedAtNew = await queryRunner.hasColumn(
      'refresh_token',
      'revokedAt',
    );

    if (hasCreatedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" DROP COLUMN "created_at"`,
      );
    }

    if (hasRevokedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" DROP COLUMN "revoked_at"`,
      );
    }

    if (!hasCreatedAtNew) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
      );
    }

    if (!hasRevokedAtNew) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "revokedAt" TIMESTAMP`,
      );
    }

    // Vérification et ajout de la contrainte unique
    const hasUniqueConstraint = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'refresh_token'
      AND constraint_name = 'UQ_c31d0a2f38e6e99110df62ab0af'
    `);

    if (!hasUniqueConstraint.length) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af" UNIQUE ("token")`,
      );
    }

    // Vérification et création des nouveaux index
    const newIndexes = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'refresh_token'
      AND indexname IN ('IDX_c31d0a2f38e6e99110df62ab0a', 'IDX_8e913e288156c133999341156a')
    `);

    if (
      !newIndexes.find((i) => i.indexname === 'IDX_c31d0a2f38e6e99110df62ab0a')
    ) {
      await queryRunner.query(
        `CREATE INDEX "IDX_c31d0a2f38e6e99110df62ab0a" ON "refresh_token" ("token")`,
      );
    }

    if (
      !newIndexes.find((i) => i.indexname === 'IDX_8e913e288156c133999341156a')
    ) {
      await queryRunner.query(
        `CREATE INDEX "IDX_8e913e288156c133999341156a" ON "refresh_token" ("userId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index avec vérification
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_8e913e288156c133999341156a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_c31d0a2f38e6e99110df62ab0a"`,
    );

    // Suppression de la contrainte unique avec vérification
    const hasUniqueConstraint = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'refresh_token'
      AND constraint_name = 'UQ_c31d0a2f38e6e99110df62ab0af'
    `);

    if (hasUniqueConstraint.length) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" DROP CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af"`,
      );
    }

    // Vérification et modification des colonnes
    const hasRevokedAt = await queryRunner.hasColumn(
      'refresh_token',
      'revokedAt',
    );
    const hasCreatedAt = await queryRunner.hasColumn(
      'refresh_token',
      'createdAt',
    );
    const hasRevokedAtOld = await queryRunner.hasColumn(
      'refresh_token',
      'revoked_at',
    );
    const hasCreatedAtOld = await queryRunner.hasColumn(
      'refresh_token',
      'created_at',
    );

    if (hasRevokedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" DROP COLUMN "revokedAt"`,
      );
    }

    if (hasCreatedAt) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" DROP COLUMN "createdAt"`,
      );
    }

    if (!hasRevokedAtOld) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "revoked_at" TIMESTAMP`,
      );
    }

    if (!hasCreatedAtOld) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
      );
    }

    // Vérification et création des anciens index
    const oldIndexes = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'refresh_token'
      AND indexname IN ('IDX_refresh_token_userId', 'IDX_refresh_token_token')
    `);

    if (!oldIndexes.find((i) => i.indexname === 'IDX_refresh_token_userId')) {
      await queryRunner.query(
        `CREATE INDEX "IDX_refresh_token_userId" ON "refresh_token" ("userId")`,
      );
    }

    if (!oldIndexes.find((i) => i.indexname === 'IDX_refresh_token_token')) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_refresh_token_token" ON "refresh_token" ("token")`,
      );
    }

    // Vérification et ajout des contraintes de notification
    const notificationConstraints = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'notification'
      AND constraint_name IN ('FK_notification_fromUser', 'FK_notification_toUser', 'FK_notification_group')
    `);

    if (
      !notificationConstraints.find(
        (c) => c.constraint_name === 'FK_notification_fromUser',
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_fromUser" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    if (
      !notificationConstraints.find(
        (c) => c.constraint_name === 'FK_notification_toUser',
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_toUser" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    if (
      !notificationConstraints.find(
        (c) => c.constraint_name === 'FK_notification_group',
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_group" FOREIGN KEY ("groupId") REFERENCES "compte_groupe"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }
}
