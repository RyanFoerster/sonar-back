import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErrorMessageAndSentAtToScheduledReminder1744370000000
  implements MigrationInterface
{
  name = 'AddErrorMessageAndSentAtToScheduledReminder1744370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne errorMessage
    await queryRunner.query(
      `ALTER TABLE "scheduled_reminder" ADD "errorMessage" character varying`,
    );

    // Ajouter la colonne sentAt
    await queryRunner.query(
      `ALTER TABLE "scheduled_reminder" ADD "sentAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne sentAt
    await queryRunner.query(
      `ALTER TABLE "scheduled_reminder" DROP COLUMN "sentAt"`,
    );

    // Supprimer la colonne errorMessage
    await queryRunner.query(
      `ALTER TABLE "scheduled_reminder" DROP COLUMN "errorMessage"`,
    );
  }
}
