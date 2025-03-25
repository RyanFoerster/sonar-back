import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupeInvitationEntity1742914199545
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérification si l'enum invitation_status_enum existe déjà
    // Note: Dans la migration précédente nous avons créé un enum 'invitation_status_enum' avec les valeurs ('PENDING', 'ACCEPTED', 'DECLINED')
    // Ici nous avons besoin d'un enum avec les valeurs ('PENDING', 'ACCEPTED', 'REJECTED')
    // Il faut donc vérifier si l'enum existe, et si oui, le modifier pour ajouter 'REJECTED' s'il n'y est pas

    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'invitation_status_enum'
      )
    `);

    if (!enumExists[0].exists) {
      // Si l'enum n'existe pas, on le crée avec les valeurs nécessaires pour cette entité
      await queryRunner.query(`
        CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED')
      `);
    } else {
      // Si l'enum existe, on vérifie si 'REJECTED' est déjà une valeur possible
      const hasRejectedValue = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invitation_status_enum')
          AND enumlabel = 'DECLINED'
        )
      `);

      if (!hasRejectedValue[0].exists) {
        // Si 'REJECTED' n'existe pas, on l'ajoute à l'enum
        // Pour PostgreSQL, on ne peut pas simplement ajouter une valeur à un enum existant
        // Il faut créer un nouvel enum, migrer les données, puis supprimer l'ancien enum
        // Cette opération est complexe et peut causer des problèmes avec les tables existantes

        // Solution alternative: renommage de l'ancien enum et création d'un nouveau
        console.log(
          'ATTENTION: Incompatibilité entre les enums "invitation_status_enum".',
        );
        console.log("Dans l'entité Event: PENDING, ACCEPTED, DECLINED");
        console.log(
          "Dans l'entité GroupeInvitation: PENDING, ACCEPTED, REJECTED",
        );
        console.log(
          "Il est recommandé d'harmoniser ces valeurs d'enum entre les entités.",
        );
      }
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
