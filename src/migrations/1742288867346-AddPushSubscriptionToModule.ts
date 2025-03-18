import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptionToModule1742288867346
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cette migration est uniquement à des fins documentaires
    // L'entité PushSubscription est déjà correctement importée dans le PushNotificationModule
    // et le PushNotificationModule est déjà importé dans le AppModule

    // Vérifier si la table push_subscription existe, si ce n'est pas le cas, exécuter la migration précédente
    const tableExists = await queryRunner.hasTable('push_subscription');
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "push_subscription" (
          "id" SERIAL PRIMARY KEY,
          "subscription" json NOT NULL,
          "active" boolean DEFAULT true,
          "userId" integer,
          "createdAt" TIMESTAMP DEFAULT now(),
          "updatedAt" TIMESTAMP DEFAULT now(),
          CONSTRAINT "FK_push_subscription_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ne rien faire pour la suppression, car nous ne voulons pas supprimer la table
    // lors de la restauration de cette migration spécifique
  }
}
