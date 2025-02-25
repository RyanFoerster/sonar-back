import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateBeneficiaryTable1738745721678 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('beneficiary');

    // Création de la table beneficiary si elle n'existe pas
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'beneficiary',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'account_owner',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'iban',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'userId',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
      // Création de la clé étrangère pour lier beneficiary à user
      await queryRunner.createForeignKey(
        'beneficiary',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'user',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression de la clé étrangère
    const table = await queryRunner.getTable('beneficiary');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );
    await queryRunner.dropForeignKey('beneficiary', foreignKey);

    // Suppression de la table
    await queryRunner.dropTable('beneficiary');
  }
}
