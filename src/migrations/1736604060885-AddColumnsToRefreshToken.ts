import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnsToRefreshToken1736604060885
  implements MigrationInterface
{
  name = 'AddColumnsToRefreshToken1736604060885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_notification_group"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_notification_toUser"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_notification_fromUser"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_token_token"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_token_userId"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "revokedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c31d0a2f38e6e99110df62ab0a" ON "refresh_token" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e913e288156c133999341156a" ON "refresh_token" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e913e288156c133999341156a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c31d0a2f38e6e99110df62ab0a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "revokedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "revoked_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_token_userId" ON "refresh_token" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refresh_token_token" ON "refresh_token" ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_fromUser" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_toUser" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_group" FOREIGN KEY ("groupId") REFERENCES "compte_groupe"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
