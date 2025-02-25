import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectNameToQuote1740391524150 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'quote',
      'created_by_project_name',
    );
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "quote" ADD "created_by_project_name" character varying DEFAULT null`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" DROP COLUMN IF EXISTS "created_by_project_name"`,
    );
  }
}
