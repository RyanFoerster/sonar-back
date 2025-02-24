import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectAttachments1740390873404 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer la nouvelle table project_attachments
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

    // Migrer les données de user_attachments vers project_attachments
    await queryRunner.query(`
            INSERT INTO project_attachments (name, key, url, type, description, created_at, updated_at)
            SELECT name, key, url, type, description, created_at, updated_at
            FROM user_attachments
        `);

    // Supprimer l'ancienne table
    await queryRunner.query(`DROP TABLE "user_attachments"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recréer l'ancienne table
    await queryRunner.query(`
            CREATE TABLE "user_attachments" (
                "id" SERIAL PRIMARY KEY,
                "name" character varying NOT NULL,
                "key" character varying NOT NULL,
                "url" character varying NOT NULL,
                "type" character varying NOT NULL,
                "description" character varying,
                "user_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);

    // Migrer les données de project_attachments vers user_attachments
    await queryRunner.query(`
            INSERT INTO user_attachments (name, key, url, type, description, created_at, updated_at)
            SELECT name, key, url, type, description, created_at, updated_at
            FROM project_attachments
        `);

    // Supprimer la nouvelle table
    await queryRunner.query(`DROP TABLE "project_attachments"`);
  }
}
