import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVirementSepaFields1734234567890
  implements MigrationInterface
{
  name = 'UpdateVirementSepaFields1734234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modification de amount_tva pour être nullable
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" ALTER COLUMN "amount_tva" DROP NOT NULL`,
    );

    // Modification de communication pour ne plus être nullable
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" ALTER COLUMN "communication" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Retour en arrière pour amount_tva
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" ALTER COLUMN "amount_tva" SET NOT NULL`,
    );

    // Retour en arrière pour communication
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" ALTER COLUMN "communication" DROP NOT NULL`,
    );
  }
}
