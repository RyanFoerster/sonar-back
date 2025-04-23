import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleFieldsToUser1745406509788 implements MigrationInterface {
  name = 'AddGoogleFieldsToUser1745406509788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne googleId (VARCHAR, nullable, unique)
    await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "googleId" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "UQ_USER_GOOGLEID" UNIQUE ("googleId")
        `);

    // Ajouter la colonne googleRefreshToken (VARCHAR, nullable)
    // Note: elle n'est pas unique car elle est NULL par défaut
    await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "googleRefreshToken" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne googleRefreshToken
    await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "googleRefreshToken"
        `);

    // Supprimer la contrainte d'unicité et la colonne googleId
    await queryRunner.query(`
            ALTER TABLE "user" DROP CONSTRAINT "UQ_USER_GOOGLEID"
        `);
    await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "googleId"
        `);
  }
}
