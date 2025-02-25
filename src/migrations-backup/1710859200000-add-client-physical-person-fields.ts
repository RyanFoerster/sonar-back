import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddClientPhysicalPersonFields1710859200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si les colonnes existent déjà
    const existingColumns = await queryRunner.getTable('client');
    const hasFirstname = existingColumns?.findColumnByName('firstname');
    const hasLastname = existingColumns?.findColumnByName('lastname');
    const hasIsPhysicalPerson =
      existingColumns?.findColumnByName('is_physical_person');

    // Ajouter firstname s'il n'existe pas
    if (!hasFirstname) {
      await queryRunner.addColumn(
        'client',
        new TableColumn({
          name: 'firstname',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Ajouter lastname s'il n'existe pas
    if (!hasLastname) {
      await queryRunner.addColumn(
        'client',
        new TableColumn({
          name: 'lastname',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Ajouter is_physical_person s'il n'existe pas
    if (!hasIsPhysicalPerson) {
      // D'abord ajouter la colonne comme nullable
      await queryRunner.addColumn(
        'client',
        new TableColumn({
          name: 'is_physical_person',
          type: 'boolean',
          isNullable: true,
          default: false,
        }),
      );

      // Mettre à jour tous les enregistrements existants
      await queryRunner.query(
        `UPDATE "client" SET "is_physical_person" = false WHERE "is_physical_person" IS NULL`,
      );

      // Ensuite modifier la colonne pour la rendre non nullable
      await queryRunner.changeColumn(
        'client',
        'is_physical_person',
        new TableColumn({
          name: 'is_physical_person',
          type: 'boolean',
          isNullable: false,
          default: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si les colonnes existent avant de les supprimer
    const existingColumns = await queryRunner.getTable('client');
    const hasFirstname = existingColumns?.findColumnByName('firstname');
    const hasLastname = existingColumns?.findColumnByName('lastname');
    const hasIsPhysicalPerson =
      existingColumns?.findColumnByName('is_physical_person');

    if (hasFirstname) {
      await queryRunner.dropColumn('client', 'firstname');
    }

    if (hasLastname) {
      await queryRunner.dropColumn('client', 'lastname');
    }

    if (hasIsPhysicalPerson) {
      await queryRunner.dropColumn('client', 'is_physical_person');
    }
  }
}
