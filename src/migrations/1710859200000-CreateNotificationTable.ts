import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1710859200000
  implements MigrationInterface
{
  name = 'CreateNotificationTable1710859200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la table existe déjà
    const tableExists = await queryRunner.hasTable('notification');
    if (!tableExists) {
      // Créer les types enum s'ils n'existent pas
      const typeEnumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'
        );
      `);

      if (!typeEnumExists[0].exists) {
        await queryRunner.query(`
          CREATE TYPE "notification_type_enum" AS ENUM('GROUP_INVITATION', 'ROLE_CHANGE', 'OTHER')
        `);
      }

      const statusEnumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notification_status_enum'
        );
      `);

      if (!statusEnumExists[0].exists) {
        await queryRunner.query(`
          CREATE TYPE "notification_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')
        `);
      }

      // Créer la table notification
      await queryRunner.query(`
        CREATE TABLE "notification" (
          "id" SERIAL NOT NULL,
          "type" notification_type_enum NOT NULL,
          "message" character varying NOT NULL,
          "status" notification_status_enum NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "fromUserId" integer,
          "toUserId" integer,
          "groupId" integer,
          CONSTRAINT "PK_notification" PRIMARY KEY ("id")
        )
      `);

      // Ajouter les clés étrangères
      await queryRunner.query(`
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_fromUser"
        FOREIGN KEY ("fromUserId")
        REFERENCES "user"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_toUser"
        FOREIGN KEY ("toUserId")
        REFERENCES "user"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_group"
        FOREIGN KEY ("groupId")
        REFERENCES "compte_groupe"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la table existe avant de la supprimer
    const tableExists = await queryRunner.hasTable('notification');
    if (tableExists) {
      // Supprimer d'abord les clés étrangères
      await queryRunner.query(`
        ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_group"
      `);
      await queryRunner.query(`
        ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_toUser"
      `);
      await queryRunner.query(`
        ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_fromUser"
      `);

      // Supprimer la table
      await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);

      // Supprimer les types enum
      await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    }
  }
}
