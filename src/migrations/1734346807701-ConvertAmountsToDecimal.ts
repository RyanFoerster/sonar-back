import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertAmountsToDecimal1734346807701
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modification des colonnes existantes en decimal
    await queryRunner.query(`
            ALTER TABLE "virement_sepa" 
            ALTER COLUMN "amount_htva" TYPE DECIMAL(10,2),
            ALTER COLUMN "amount_tva" TYPE DECIMAL(10,2),
            ALTER COLUMN "amount_total" TYPE DECIMAL(10,2)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Retour en arrière si nécessaire
    await queryRunner.query(`
            ALTER TABLE "virement_sepa" 
            ALTER COLUMN "amount_htva" TYPE INTEGER,
            ALTER COLUMN "amount_tva" TYPE INTEGER,
            ALTER COLUMN "amount_total" TYPE INTEGER
        `);
  }
}
