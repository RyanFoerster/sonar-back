import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsVatIncludedToInvoice1744015863789
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne existe déjà pour éviter les erreurs
    const hasColumn = await queryRunner.hasColumn('invoice', 'isVatIncluded');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "invoice" ADD "isVatIncluded" boolean NOT NULL DEFAULT false`,
      );
      console.log('Colonne isVatIncluded ajoutée à la table invoice');
    } else {
      console.log('La colonne isVatIncluded existe déjà dans la table invoice');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne existe avant de la supprimer
    const hasColumn = await queryRunner.hasColumn('invoice', 'isVatIncluded');
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "invoice" DROP COLUMN "isVatIncluded"`,
      );
      console.log('Colonne isVatIncluded supprimée de la table invoice');
    } else {
      console.log(
        "La colonne isVatIncluded n'existe pas dans la table invoice",
      );
    }
  }
}
