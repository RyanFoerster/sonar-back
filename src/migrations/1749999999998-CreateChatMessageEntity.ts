import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateChatMessageEntity1749999999998
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si l'extension uuid-ossp est activée (nécessaire pour les UUID)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Création de la table chat_message
    await queryRunner.createTable(
      new Table({
        name: 'chat_message',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'eventId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'senderName',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'senderEmail',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Création de la clé étrangère vers la table event
    await queryRunner.createForeignKey(
      'chat_message',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'event',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    // Création d'un index sur eventId pour optimiser les requêtes
    await queryRunner.query(`
      CREATE INDEX "IDX_chat_message_eventId" ON "chat_message" ("eventId")
    `);

    // Création d'un index sur createdAt pour optimiser le tri des messages
    await queryRunner.query(`
      CREATE INDEX "IDX_chat_message_createdAt" ON "chat_message" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_message_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_message_eventId"`);

    // Récupération de la table pour supprimer la clé étrangère
    const table = await queryRunner.getTable('chat_message');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('eventId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('chat_message', foreignKey);
      }
    }

    // Suppression de la table chat_message
    await queryRunner.dropTable('chat_message');
  }
}
