import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertSoldeToDecimal1749999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Conversion pour compte_principal
    await queryRunner.query(
      `ALTER TABLE compte_principal ADD COLUMN solde_temp DECIMAL(10,2)`,
    );

    await queryRunner.query(
      `UPDATE compte_principal SET solde_temp = CAST(solde AS DECIMAL(10,2))`,
    );

    await queryRunner.query(`ALTER TABLE compte_principal DROP COLUMN solde`);

    await queryRunner.query(
      `ALTER TABLE compte_principal RENAME COLUMN solde_temp TO solde`,
    );

    await queryRunner.query(
      `ALTER TABLE compte_principal ALTER COLUMN solde SET DEFAULT 0`,
    );

    // Conversion pour compte_groupe
    await queryRunner.query(
      `ALTER TABLE compte_groupe ADD COLUMN solde_temp DECIMAL(10,2)`,
    );

    await queryRunner.query(
      `UPDATE compte_groupe SET solde_temp = CAST(solde AS DECIMAL(10,2))`,
    );

    await queryRunner.query(`ALTER TABLE compte_groupe DROP COLUMN solde`);

    await queryRunner.query(
      `ALTER TABLE compte_groupe RENAME COLUMN solde_temp TO solde`,
    );

    await queryRunner.query(
      `ALTER TABLE compte_groupe ALTER COLUMN solde SET DEFAULT 0`,
    );

    // Conversion pour transaction (amount)
    await queryRunner.query(
      `ALTER TABLE transaction ADD COLUMN amount_temp DECIMAL(10,2)`,
    );

    await queryRunner.query(
      `UPDATE transaction SET amount_temp = CAST(amount AS DECIMAL(10,2))`,
    );

    await queryRunner.query(`ALTER TABLE transaction DROP COLUMN amount`);

    await queryRunner.query(
      `ALTER TABLE transaction RENAME COLUMN amount_temp TO amount`,
    );

    await queryRunner.query(
      `ALTER TABLE transaction ALTER COLUMN amount SET DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Réversion pour compte_principal
    await queryRunner.query(
      `ALTER TABLE compte_principal ADD COLUMN solde_temp double precision`,
    );

    await queryRunner.query(
      `UPDATE compte_principal SET solde_temp = CAST(solde AS double precision)`,
    );

    await queryRunner.query(`ALTER TABLE compte_principal DROP COLUMN solde`);

    await queryRunner.query(
      `ALTER TABLE compte_principal RENAME COLUMN solde_temp TO solde`,
    );

    await queryRunner.query(
      `ALTER TABLE compte_principal ALTER COLUMN solde SET DEFAULT 0`,
    );

    // Réversion pour compte_groupe
    await queryRunner.query(
      `ALTER TABLE compte_groupe ADD COLUMN solde_temp double precision`,
    );

    await queryRunner.query(
      `UPDATE compte_groupe SET solde_temp = CAST(solde AS double precision)`,
    );

    await queryRunner.query(`ALTER TABLE compte_groupe DROP COLUMN solde`);

    await queryRunner.query(
      `ALTER TABLE compte_groupe RENAME COLUMN solde_temp TO solde`,
    );

    await queryRunner.query(
      `ALTER TABLE compte_groupe ALTER COLUMN solde SET DEFAULT 0`,
    );

    // Réversion pour transaction (amount)
    await queryRunner.query(
      `ALTER TABLE transaction ADD COLUMN amount_temp double precision`,
    );

    await queryRunner.query(
      `UPDATE transaction SET amount_temp = CAST(amount AS double precision)`,
    );

    await queryRunner.query(`ALTER TABLE transaction DROP COLUMN amount`);

    await queryRunner.query(
      `ALTER TABLE transaction RENAME COLUMN amount_temp TO amount`,
    );

    await queryRunner.query(
      `ALTER TABLE transaction ALTER COLUMN amount SET DEFAULT 0`,
    );
  }
}
