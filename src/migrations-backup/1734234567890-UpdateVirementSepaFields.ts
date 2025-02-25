import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVirementSepaFields1734234567890
  implements MigrationInterface
{
  name = 'UpdateVirementSepaFields1734234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérification et modification de amount_tva pour être nullable
    const amountTvaResult = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns 
       WHERE table_name = 'virement_sepa' AND column_name = 'amount_tva'`,
    );

    if (amountTvaResult[0]?.is_nullable === 'NO') {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ALTER COLUMN "amount_tva" DROP NOT NULL`,
      );
    }

    // Vérification et modification de communication pour ne plus être nullable
    const communicationResult = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns 
       WHERE table_name = 'virement_sepa' AND column_name = 'communication'`,
    );

    if (communicationResult[0]?.is_nullable === 'YES') {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ALTER COLUMN "communication" SET NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vérification et retour en arrière pour amount_tva
    const amountTvaResult = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns 
       WHERE table_name = 'virement_sepa' AND column_name = 'amount_tva'`,
    );

    if (amountTvaResult[0]?.is_nullable === 'YES') {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ALTER COLUMN "amount_tva" SET NOT NULL`,
      );
    }

    // Vérification et retour en arrière pour communication
    const communicationResult = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns 
       WHERE table_name = 'virement_sepa' AND column_name = 'communication'`,
    );

    if (communicationResult[0]?.is_nullable === 'NO') {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ALTER COLUMN "communication" DROP NOT NULL`,
      );
    }
  }
}
