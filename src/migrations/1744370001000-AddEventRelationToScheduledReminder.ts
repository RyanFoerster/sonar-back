import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventRelationToScheduledReminder1744370001000
  implements MigrationInterface
{
  name = 'AddEventRelationToScheduledReminder1744370001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la contrainte de clé étrangère existe déjà
    const foreignKeyExists = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'scheduled_reminder' 
      AND constraint_type = 'FOREIGN KEY' 
      AND constraint_name LIKE '%eventId%'
    `);

    // Si la contrainte n'existe pas, la créer
    if (foreignKeyExists.length === 0) {
      // Ajouter la contrainte de clé étrangère
      await queryRunner.query(`
        ALTER TABLE "scheduled_reminder" 
        ADD CONSTRAINT "FK_scheduled_reminder_eventId" 
        FOREIGN KEY ("eventId") 
        REFERENCES "event"("id") 
        ON DELETE CASCADE
      `);
    }

    // Créer un index sur eventId pour améliorer les performances
    const indexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'scheduled_reminder' 
      AND indexname = 'IDX_scheduled_reminder_eventId'
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_scheduled_reminder_eventId" 
        ON "scheduled_reminder" ("eventId")
      `);
    }

    // Créer un index sur status et scheduledDate pour optimiser les requêtes du scheduler
    const schedulerIndexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'scheduled_reminder' 
      AND indexname = 'IDX_scheduled_reminder_status_scheduledDate'
    `);

    if (schedulerIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_scheduled_reminder_status_scheduledDate" 
        ON "scheduled_reminder" ("status", "scheduledDate")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'index sur status et scheduledDate
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_scheduled_reminder_status_scheduledDate"
    `);

    // Supprimer l'index sur eventId
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_scheduled_reminder_eventId"
    `);

    // Supprimer la contrainte de clé étrangère
    await queryRunner.query(`
      ALTER TABLE "scheduled_reminder" 
      DROP CONSTRAINT IF EXISTS "FK_scheduled_reminder_eventId"
    `);
  }
}
