import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToCompteGroupe1740391524149
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la table project_attachments existe déjà
    const tableExists = await queryRunner.hasTable('project_attachments');
    if (!tableExists) {
      // Créer la table project_attachments si elle n'existe pas
      await queryRunner.query(`
                CREATE TABLE "project_attachments" (
                    "id" SERIAL PRIMARY KEY,
                    "name" character varying NOT NULL,
                    "key" character varying NOT NULL,
                    "url" character varying NOT NULL,
                    "type" character varying NOT NULL,
                    "description" character varying,
                    "compte_principal_id" integer,
                    "compte_groupe_id" integer,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "fk_compte_principal" FOREIGN KEY ("compte_principal_id") REFERENCES "compte_principal"("id") ON DELETE CASCADE,
                    CONSTRAINT "fk_compte_groupe" FOREIGN KEY ("compte_groupe_id") REFERENCES "compte_groupe"("id") ON DELETE CASCADE
                )
            `);
    } else {
      // Si la table existe déjà, ajouter seulement la colonne compte_groupe_id si elle n'existe pas
      const hasCompteGroupeColumn = await queryRunner.hasColumn(
        'project_attachments',
        'compte_groupe_id',
      );
      if (!hasCompteGroupeColumn) {
        await queryRunner.query(`
                    ALTER TABLE "project_attachments"
                    ADD COLUMN "compte_groupe_id" integer,
                    ADD CONSTRAINT "fk_compte_groupe" 
                    FOREIGN KEY ("compte_groupe_id") 
                    REFERENCES "compte_groupe"("id") 
                    ON DELETE CASCADE
                `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la contrainte de clé étrangère
    await queryRunner.query(`
            ALTER TABLE "project_attachments"
            DROP CONSTRAINT IF EXISTS "fk_compte_groupe"
        `);

    // Supprimer la colonne
    await queryRunner.query(`
            ALTER TABLE "project_attachments"
            DROP COLUMN IF EXISTS "compte_groupe_id"
        `);
  }
}
