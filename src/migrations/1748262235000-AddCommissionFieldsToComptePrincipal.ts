import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionFieldsToComptePrincipal1748262235000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter commissionPourcentage
    const hasCommissionPourcentage = await queryRunner.hasColumn(
      'compte_principal',
      'commissionPourcentage',
    );
    if (!hasCommissionPourcentage) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" ADD "commissionPourcentage" double precision NOT NULL DEFAULT 5`,
      );
      console.log(
        'Colonne commissionPourcentage ajoutée à la table compte_principal',
      );
    } else {
      console.log(
        'La colonne commissionPourcentage existe déjà dans la table compte_principal',
      );
    }

    // Ajouter commission
    const hasCommission = await queryRunner.hasColumn(
      'compte_principal',
      'commission',
    );
    if (!hasCommission) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" ADD "commission" double precision NOT NULL DEFAULT 0`,
      );
      console.log('Colonne commission ajoutée à la table compte_principal');
    } else {
      console.log(
        'La colonne commission existe déjà dans la table compte_principal',
      );
    }

    // Ajouter CommissionRecipientAccount
    const hasCommissionRecipientAccount = await queryRunner.hasColumn(
      'compte_principal',
      'CommissionRecipientAccount',
    );
    if (!hasCommissionRecipientAccount) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" ADD "CommissionRecipientAccount" boolean NOT NULL DEFAULT false`,
      );
      console.log(
        'Colonne CommissionRecipientAccount ajoutée à la table compte_principal',
      );
    } else {
      console.log(
        'La colonne CommissionRecipientAccount existe déjà dans la table compte_principal',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer CommissionRecipientAccount
    const hasCommissionRecipientAccount = await queryRunner.hasColumn(
      'compte_principal',
      'CommissionRecipientAccount',
    );
    if (hasCommissionRecipientAccount) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" DROP COLUMN "CommissionRecipientAccount"`,
      );
      console.log(
        'Colonne CommissionRecipientAccount supprimée de la table compte_principal',
      );
    }

    // Supprimer commission
    const hasCommission = await queryRunner.hasColumn(
      'compte_principal',
      'commission',
    );
    if (hasCommission) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" DROP COLUMN "commission"`,
      );
      console.log('Colonne commission supprimée de la table compte_principal');
    }

    // Supprimer commissionPourcentage
    const hasCommissionPourcentage = await queryRunner.hasColumn(
      'compte_principal',
      'commissionPourcentage',
    );
    if (hasCommissionPourcentage) {
      await queryRunner.query(
        `ALTER TABLE "compte_principal" DROP COLUMN "commissionPourcentage"`,
      );
      console.log(
        'Colonne commissionPourcentage supprimée de la table compte_principal',
      );
    }
  }
}
