import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduledReminderEntity1744369999999
  implements MigrationInterface
{
  name = 'CreateScheduledReminderEntity1744369999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Création de l'enum ReminderStatus
    await queryRunner.query(`
      CREATE TYPE "reminder_status_enum" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED')
    `);

    // Création de la table scheduled_reminder
    await queryRunner.query(`
      CREATE TABLE "scheduled_reminder" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "recipientIds" jsonb NOT NULL,
        "scheduledDate" TIMESTAMP NOT NULL,
        "customMessage" character varying,
        "status" "reminder_status_enum" NOT NULL DEFAULT 'PENDING',
        "errorMessage" character varying,
        "sentAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_reminder" PRIMARY KEY ("id")
      )
    `);

    // Création de la clé étrangère vers la table event
    await queryRunner.query(`
      ALTER TABLE "scheduled_reminder" 
      ADD CONSTRAINT "FK_scheduled_reminder_eventId" 
      FOREIGN KEY ("eventId") 
      REFERENCES "event"("id") 
      ON DELETE CASCADE
    `);

    // Création des index pour optimiser les performances
    await queryRunner.query(`
      CREATE INDEX "IDX_scheduled_reminder_eventId" 
      ON "scheduled_reminder" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_scheduled_reminder_status_scheduledDate" 
      ON "scheduled_reminder" ("status", "scheduledDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_scheduled_reminder_status_scheduledDate"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_scheduled_reminder_eventId"
    `);

    // Suppression de la contrainte de clé étrangère
    await queryRunner.query(`
      ALTER TABLE "scheduled_reminder" 
      DROP CONSTRAINT IF EXISTS "FK_scheduled_reminder_eventId"
    `);

    // Suppression de la table
    await queryRunner.query(`DROP TABLE "scheduled_reminder"`);

    // Suppression de l'enum
    await queryRunner.query(`DROP TYPE "reminder_status_enum"`);
  }
}
