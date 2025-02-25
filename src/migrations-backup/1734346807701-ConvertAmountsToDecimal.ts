import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertAmountsToDecimal1734346807701
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = ['amount_htva', 'amount_tva', 'amount_total'];

    for (const column of columns) {
      const columnType = await queryRunner.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'virement_sepa' 
        AND column_name = '${column}'
      `);

      if (columnType[0]?.data_type !== 'numeric') {
        await queryRunner.query(`
          ALTER TABLE "virement_sepa" 
          ALTER COLUMN "${column}" TYPE DECIMAL(10,2)
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = ['amount_htva', 'amount_tva', 'amount_total'];

    for (const column of columns) {
      const columnType = await queryRunner.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'virement_sepa' 
        AND column_name = '${column}'
      `);

      if (columnType[0]?.data_type === 'numeric') {
        await queryRunner.query(`
          ALTER TABLE "virement_sepa" 
          ALTER COLUMN "${column}" TYPE INTEGER
        `);
      }
    }
  }
}
