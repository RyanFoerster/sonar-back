import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceRelationToEntities1748867833387
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne invoice existe déjà dans la table transaction
    const hasInvoiceColumnInTransaction = await queryRunner.hasColumn(
      'transaction',
      'invoiceId',
    );
    if (!hasInvoiceColumnInTransaction) {
      await queryRunner.query(
        `ALTER TABLE "transaction" ADD "invoiceId" integer`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_invoice" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    // Vérifier si la colonne invoice existe déjà dans la table virement_sepa
    const hasInvoiceColumnInVirementSepa = await queryRunner.hasColumn(
      'virement_sepa',
      'invoiceId',
    );
    if (!hasInvoiceColumnInVirementSepa) {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ADD "invoiceId" integer`,
      );
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" ADD CONSTRAINT "FK_virement_sepa_invoice" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la relation invoice de la table transaction
    const hasInvoiceColumnInTransaction = await queryRunner.hasColumn(
      'transaction',
      'invoiceId',
    );
    if (hasInvoiceColumnInTransaction) {
      await queryRunner.query(
        `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_invoice"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction" DROP COLUMN "invoiceId"`,
      );
    }

    // Supprimer la relation invoice de la table virement_sepa
    const hasInvoiceColumnInVirementSepa = await queryRunner.hasColumn(
      'virement_sepa',
      'invoiceId',
    );
    if (hasInvoiceColumnInVirementSepa) {
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" DROP CONSTRAINT "FK_virement_sepa_invoice"`,
      );
      await queryRunner.query(
        `ALTER TABLE "virement_sepa" DROP COLUMN "invoiceId"`,
      );
    }
  }
}
