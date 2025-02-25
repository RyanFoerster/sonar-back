import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAttachments1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_attachments" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "key" character varying NOT NULL,
        "url" character varying NOT NULL,
        "type" character varying NOT NULL,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer,
        CONSTRAINT "PK_user_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_attachments_users" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_attachments"`);
  }
}
