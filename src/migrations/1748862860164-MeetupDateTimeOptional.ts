import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetupDateTimeOptional1748862860164 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // S'assurer que les colonnes meetupDateTime et endDateTime sont définies comme nullable
    await queryRunner.query(
      `ALTER TABLE "event" ALTER COLUMN "meetup_date_time" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" ALTER COLUMN "end_date_time" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cette migration est irréversible car cela pourrait causer des erreurs sur les données existantes
    // Si vraiment nécessaire, on pourrait ajouter une contrainte NOT NULL,
    // mais cela échouerait si des données NULL existent déjà
  }
}
