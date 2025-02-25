import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1710859200000
  implements MigrationInterface
{
  name = 'CreateNotificationTable1710859200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer les types enum et la table avec vérifications
    await queryRunner.query(`
      DO $$ BEGIN
        -- Créer le type enum pour notification_type s'il n'existe pas
        CREATE TYPE notification_type_enum AS ENUM ('GROUP_INVITATION', 'ROLE_CHANGE', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        -- Créer le type enum pour notification_status s'il n'existe pas
        CREATE TYPE notification_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      -- Créer la table notification si elle n'existe pas
      CREATE TABLE IF NOT EXISTS "notification" (
        "id" SERIAL NOT NULL,
        "type" notification_type_enum NOT NULL,
        "message" character varying NOT NULL,
        "status" notification_status_enum NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "fromUserId" integer,
        "toUserId" integer,
        "groupId" integer,
        CONSTRAINT "PK_notification" PRIMARY KEY ("id")
      );

      -- Ajouter les clés étrangères si elles n'existent pas
      DO $$ BEGIN
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_fromUser"
        FOREIGN KEY ("fromUserId")
        REFERENCES "user"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_toUser"
        FOREIGN KEY ("toUserId")
        REFERENCES "user"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_group"
        FOREIGN KEY ("groupId")
        REFERENCES "compte_groupe"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Supprimer les clés étrangères
      ALTER TABLE IF EXISTS "notification" 
      DROP CONSTRAINT IF EXISTS "FK_notification_group",
      DROP CONSTRAINT IF EXISTS "FK_notification_toUser",
      DROP CONSTRAINT IF EXISTS "FK_notification_fromUser";

      -- Supprimer la table
      DROP TABLE IF EXISTS "notification";

      -- Supprimer les types enum
      DROP TYPE IF EXISTS notification_status_enum;
      DROP TYPE IF EXISTS notification_type_enum;
    `);
  }
}
