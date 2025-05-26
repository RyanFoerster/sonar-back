import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionFieldsToCompteGroupe1748262236000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter commissionPourcentage
    const hasCommissionPourcentage = await queryRunner.hasColumn(
      'compte_groupe',
      'commissionPourcentage',
    );
    if (!hasCommissionPourcentage) {
      await queryRunner.query(
        `ALTER TABLE "compte_groupe" ADD "commissionPourcentage" double precision NOT NULL DEFAULT 5`,
      );
      console.log(
        'Colonne commissionPourcentage ajoutée à la table compte_groupe',
      );
    } else {
      console.log(
        'La colonne commissionPourcentage existe déjà dans la table compte_groupe',
      );
    }

    // Ajouter commission
    const hasCommission = await queryRunner.hasColumn(
      'compte_groupe',
      'commission',
    );
    if (!hasCommission) {
      await queryRunner.query(
        `ALTER TABLE "compte_groupe" ADD "commission" double precision NOT NULL DEFAULT 0`,
      );
      console.log('Colonne commission ajoutée à la table compte_groupe');
    } else {
      console.log(
        'La colonne commission existe déjà dans la table compte_groupe',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer commission
    const hasCommission = await queryRunner.hasColumn(
      'compte_groupe',
      'commission',
    );
    if (hasCommission) {
      await queryRunner.query(
        `ALTER TABLE "compte_groupe" DROP COLUMN "commission"`,
      );
      console.log('Colonne commission supprimée de la table compte_groupe');
    }

    // Supprimer commissionPourcentage
    const hasCommissionPourcentage = await queryRunner.hasColumn(
      'compte_groupe',
      'commissionPourcentage',
    );
    if (hasCommissionPourcentage) {
      await queryRunner.query(
        `ALTER TABLE "compte_groupe" DROP COLUMN "commissionPourcentage"`,
      );
      console.log(
        'Colonne commissionPourcentage supprimée de la table compte_groupe',
      );
    }
  }
}
