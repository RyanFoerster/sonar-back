import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1710859200000
  implements MigrationInterface
{
  name = 'CreateNotificationTable1710859200000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la table existe déjà
    const tableExists = await queryRunner.hasTable('notification');
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "notification" (
          "id" SERIAL NOT NULL,
          "type" character varying NOT NULL,
          "status" character varying NOT NULL DEFAULT 'PENDING',
          "message" character varying,
          "groupId" integer,
          "userId" integer NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_notification" PRIMARY KEY ("id")
        )
      `);

      // Ajouter les clés étrangères
      await queryRunner.query(`
        ALTER TABLE "notification"
        ADD CONSTRAINT "FK_notification_user"
        FOREIGN KEY ("userId")
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
        ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_user"
      `);
      // Supprimer la table
      await queryRunner.query(`DROP TABLE "notification"`);
    }
  }
}
