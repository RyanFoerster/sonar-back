import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupeInvitationEntity1742914199545
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Création de l'enum InvitationStatus si elle n'existe pas déjà
    const enumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'invitation_status_enum'
            )
        `);

    if (!enumExists[0].exists) {
      await queryRunner.query(`
                CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED')
            `);
    }

    // Création de la table groupe_invitation
    await queryRunner.query(`
            CREATE TABLE "groupe_invitation" (
                "id" SERIAL NOT NULL,
                "invitedUserId" integer NOT NULL,
                "groupId" integer NOT NULL,
                "status" "invitation_status_enum" NOT NULL DEFAULT 'PENDING',
                "message" character varying,
                "isNotified" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_groupe_invitation" PRIMARY KEY ("id")
            )
        `);

    // Création des clés étrangères
    await queryRunner.query(`
            ALTER TABLE "groupe_invitation" ADD CONSTRAINT "FK_groupe_invitation_user" 
            FOREIGN KEY ("invitedUserId") REFERENCES "user"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "groupe_invitation" ADD CONSTRAINT "FK_groupe_invitation_compte_groupe" 
            FOREIGN KEY ("groupId") REFERENCES "compte_groupe"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des clés étrangères
    await queryRunner.query(`
            ALTER TABLE "groupe_invitation" DROP CONSTRAINT "FK_groupe_invitation_compte_groupe"
        `);

    await queryRunner.query(`
            ALTER TABLE "groupe_invitation" DROP CONSTRAINT "FK_groupe_invitation_user"
        `);

    // Suppression de la table groupe_invitation
    await queryRunner.query(`DROP TABLE "groupe_invitation"`);

    // On ne supprime pas l'enum InvitationStatus car il peut être utilisé par d'autres tables
  }
}
