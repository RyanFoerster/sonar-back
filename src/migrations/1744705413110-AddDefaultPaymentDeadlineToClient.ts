import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDefaultPaymentDeadlineToClient1744705413110
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'client',
      new TableColumn({
        name: 'default_payment_deadline',
        type: 'int',
        isNullable: true,
        comment: 'Default payment deadline in days',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('client', 'default_payment_deadline');
  }
}
