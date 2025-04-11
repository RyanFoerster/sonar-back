import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReminderLevelManually1744369509670
  implements MigrationInterface
{
  name = "AddReminderLevelManually1744369509670";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajoute la colonne reminder_level avec une valeur par défaut de 0
    await queryRunner.query(
      `ALTER TABLE "invoice" ADD "reminder_level" integer NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprime la colonne reminder_level
    await queryRunner.query(
      `ALTER TABLE "invoice" DROP COLUMN "reminder_level"`
    );
  }
}
