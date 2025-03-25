import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyUserAndCompteGroupeEntities1742914208911
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si des tables anciennes existent encore
    const invitationTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'invitation'
            )
        `);

    const commentTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'comment'
            )
        `);

    const oldEventTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'old_event'
            )
        `);

    // Suppression des relations Invitation et Comment dans User si elles existent
    if (invitationTableExists[0].exists) {
      // Suppression des contraintes et références
      try {
        await queryRunner.query(`
                    ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "FK_invitation_user"
                `);
      } catch (error) {
        console.log(
          'Contrainte FK_invitation_user non trouvée ou déjà supprimée',
        );
      }
    }

    if (commentTableExists[0].exists) {
      // Suppression des contraintes et références
      try {
        await queryRunner.query(`
                    ALTER TABLE "comment" DROP CONSTRAINT IF EXISTS "FK_comment_user"
                `);
      } catch (error) {
        console.log('Contrainte FK_comment_user non trouvée ou déjà supprimée');
      }
    }

    // Gestion de l'ancienne table Event si elle existe
    if (oldEventTableExists[0].exists) {
      try {
        // Suppression des contraintes de l'ancienne table Event
        await queryRunner.query(`
                    ALTER TABLE "old_event" DROP CONSTRAINT IF EXISTS "FK_old_event_compte_groupe"
                `);
      } catch (error) {
        console.log(
          'Contrainte FK_old_event_compte_groupe non trouvée ou déjà supprimée',
        );
      }
    }

    // Mise à jour de la relation dans CompteGroupe - elle sera remplacée par la nouvelle relation définie dans la migration CreateEventEntity
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cette migration ne peut pas être facilement inversée car elle supprime des données
    // et restructure le schéma de la base de données
    console.log('Cette migration ne peut pas être inversée automatiquement');
  }
}
