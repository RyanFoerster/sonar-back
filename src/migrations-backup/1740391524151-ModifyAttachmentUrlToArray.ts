import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyAttachmentUrlToArray1740391524151
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // D'abord, créer une nouvelle colonne temporaire de type array
    await queryRunner.query(`
      ALTER TABLE "quote" 
      ADD COLUMN "attachment_url_new" text[] DEFAULT '{}';
    `);

    // Copier les anciennes valeurs dans le nouveau format (si elles existent)
    await queryRunner.query(`
      UPDATE "quote" 
      SET "attachment_url_new" = ARRAY[attachment_url]
      WHERE attachment_url IS NOT NULL;
    `);

    // Supprimer l'ancienne colonne
    await queryRunner.query(`
      ALTER TABLE "quote" 
      DROP COLUMN "attachment_url";
    `);

    // Renommer la nouvelle colonne
    await queryRunner.query(`
      ALTER TABLE "quote" 
      RENAME COLUMN "attachment_url_new" TO "attachment_url";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Créer une nouvelle colonne de type string
    await queryRunner.query(`
      ALTER TABLE "quote" 
      ADD COLUMN "attachment_url_old" character varying DEFAULT NULL;
    `);

    // Copier la première valeur du tableau (s'il existe)
    await queryRunner.query(`
      UPDATE "quote" 
      SET "attachment_url_old" = (attachment_url)[1]
      WHERE array_length(attachment_url, 1) > 0;
    `);

    // Supprimer la colonne tableau
    await queryRunner.query(`
      ALTER TABLE "quote" 
      DROP COLUMN "attachment_url";
    `);

    // Renommer la colonne
    await queryRunner.query(`
      ALTER TABLE "quote" 
      RENAME COLUMN "attachment_url_old" TO "attachment_url";
    `);
  }
}
