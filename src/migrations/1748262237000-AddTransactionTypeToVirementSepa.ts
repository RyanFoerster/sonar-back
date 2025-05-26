import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionTypeToVirementSepa1748262237000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter transaction_type
    const hasTransactionType = await queryRunner.hasColumn(
      'virement_sepa',
      'transaction_type',
    );
    if (!hasTransactionType) {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ADD "transaction_type" character varying NOT NULL DEFAULT 'OUTGOING'`,
      );

      // Ajouter la contrainte CHECK pour l'enum
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ADD CONSTRAINT "CHK_transaction_type" CHECK ("transaction_type" IN ('INCOMING', 'OUTGOING'))`,
      );

      console.log('Colonne transaction_type ajoutée à la table virement_sepa');
    } else {
      console.log(
        'La colonne transaction_type existe déjà dans la table virement_sepa',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer transaction_type
    const hasTransactionType = await queryRunner.hasColumn(
      'virement_sepa',
      'transaction_type',
    );
    if (hasTransactionType) {
      // Supprimer d'abord la contrainte CHECK
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" DROP CONSTRAINT IF EXISTS "CHK_transaction_type"`,
      );

      // Puis supprimer la colonne
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" DROP COLUMN "transaction_type"`,
      );

      console.log(
        'Colonne transaction_type supprimée de la table virement_sepa',
      );
    }
  }
}
