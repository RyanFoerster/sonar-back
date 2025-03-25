import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventEntity1742914187445 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Création de l'enum EventStatus
    await queryRunner.query(`
            CREATE TYPE "event_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED')
        `);

    // Création de l'enum InvitationStatus
    await queryRunner.query(`
            CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED')
        `);

    // Création de la table Event
    await queryRunner.query(`
            CREATE TABLE "event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "description" character varying,
                "location" character varying,
                "startDateTime" TIMESTAMP NOT NULL,
                "endDateTime" TIMESTAMP NOT NULL,
                "meetupDateTime" TIMESTAMP NOT NULL,
                "status" "event_status_enum" NOT NULL DEFAULT 'PENDING',
                "cancellationReason" character varying,
                "invitedPeople" jsonb NOT NULL DEFAULT '[]',
                "groupId" integer NOT NULL,
                "organizers" jsonb NOT NULL,
                "participants" jsonb NOT NULL DEFAULT '[]',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_event" PRIMARY KEY ("id")
            )
        `);

    // Création de la clé étrangère
    await queryRunner.query(`
            ALTER TABLE "event" ADD CONSTRAINT "FK_event_compte_groupe" 
            FOREIGN KEY ("groupId") REFERENCES "compte_groupe"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression de la clé étrangère
    await queryRunner.query(`
            ALTER TABLE "event" DROP CONSTRAINT "FK_event_compte_groupe"
        `);

    // Suppression de la table Event
    await queryRunner.query(`DROP TABLE "event"`);

    // Suppression des enums
    await queryRunner.query(`DROP TYPE "invitation_status_enum"`);
    await queryRunner.query(`DROP TYPE "event_status_enum"`);
  }
}
