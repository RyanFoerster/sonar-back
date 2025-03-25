import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationEntity1742914203473
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Création de la table notification
    await queryRunner.query(`
            CREATE TABLE "notification" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "type" character varying NOT NULL,
                "title" character varying NOT NULL,
                "message" character varying NOT NULL,
                "isRead" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "data" jsonb,
                CONSTRAINT "PK_notification" PRIMARY KEY ("id")
            )
        `);

    // Création de la clé étrangère
    await queryRunner.query(`
            ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_user" 
            FOREIGN KEY ("userId") REFERENCES "user"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression de la clé étrangère
    await queryRunner.query(`
            ALTER TABLE "notification" DROP CONSTRAINT "FK_notification_user"
        `);

    // Suppression de la table notification
    await queryRunner.query(`DROP TABLE "notification"`);
  }
}
