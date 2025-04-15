import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGlobalCounter1749034561000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'global_counter',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'next_invoice_number',
            type: 'int',
            default: 1,
          },
          {
            name: 'next_quote_number',
            type: 'int',
            default: 1,
          },
          {
            name: 'type',
            type: 'varchar',
            default: "'MAIN'",
          },
        ],
      }),
      true,
    );

    // Insertion du compteur global par défaut
    await queryRunner.query(`
      INSERT INTO global_counter (type, next_invoice_number, next_quote_number)
      VALUES ('MAIN', 1, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('global_counter');
  }
}
