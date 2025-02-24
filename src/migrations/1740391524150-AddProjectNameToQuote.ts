import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectNameToQuote1740391524150 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" ADD "created_by_project_name" character varying DEFAULT null`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" DROP COLUMN "created_by_project_name"`,
    );
  }
}
