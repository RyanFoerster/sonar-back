import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedReasonToVirementSepa1733833800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" ADD COLUMN "rejected_reason" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virement_sepa" DROP COLUMN "rejected_reason"`,
    );
  }
}
