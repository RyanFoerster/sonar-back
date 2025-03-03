import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../users/entities/user.entity';
import axios from 'axios';
import { Invoice } from '@/invoice/entities/invoice.entity';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(
    to: string,
    token: string,
    firstName: string,
    name: string,
  ) {
    const API_KEY =
      this.configService.get('stage') === 'prod'
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');
    try {
      Logger.debug('API_KEY', API_KEY);
      fetch(`https://api.mailhub.sh/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          layout_identifier: 'tp-dc76ec2fba7f4b04',
          variables: {
            firstName,
            name,
            resetToken: token,
          },
          from: 'info@sonarartists.fr',
          to,
          subject: 'Réinitialisation du mot de passe',
          language: null,
        }),
      }).then((data) => console.log(data));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async sendDevisAcceptationEmail(
    to: string,
    firstName: string,
    quote_id: number,
    role: 'GROUP' | 'CLIENT',
    email: string,
    date: string,
    comment: string,
    amount: number,
    client: string,
    name?: string,
    attachments?: Buffer[],
    attachmentNames?: string[],
    project?: string,
  ) {
    const API_KEY = this.configService.get('mailhub.api_key_prod');
    const config = this.configService.get('isProd') ? 'PROD' : 'DEV';

    try {
      // Créer le payload de base
      const payload = {
        layout_identifier: 'tp-3fab551a26be4e9a',
        variables: {
          firstName,
          role,
          quote_id,
          name,
          config,
          email,
          project,
          date,
          comment,
          amount,
          client,
        },
        from: 'info@sonarartists.fr',
        to,
        subject: "Demande d'acceptation de devis",
        language: null,
      };

      // Ajouter les pièces jointes si elles existent
      if (attachments?.length && attachmentNames?.length) {
        // Vérifier la taille totale des pièces jointes avant encodage
        const totalSizeInMB =
          attachments.reduce((acc, attachment) => acc + attachment.length, 0) /
          (1024 * 1024);
        Logger.debug(
          `Total size of attachments before encoding: ${totalSizeInMB.toFixed(2)} MB`,
        );

        // Optimiser les pièces jointes pour réduire leur taille
        const optimizedAttachments = attachments.map((attachment, index) => {
          const originalSizeMB = attachment.length / (1024 * 1024);
          const base64Content = attachment.toString('base64');
          const encodedSizeMB = base64Content.length / (1024 * 1024);

          Logger.debug(
            `Attachment ${attachmentNames[index]}: Original size: ${originalSizeMB.toFixed(2)} MB, Encoded: ${encodedSizeMB.toFixed(2)} MB`,
          );

          return {
            filename: attachmentNames[index],
            content: base64Content,
            contentType: 'application/pdf',
          };
        });

        payload['attachments'] = optimizedAttachments;
      }

      Logger.debug(
        `Number of attachments: ${payload['attachments']?.length || 0}`,
      );

      // Calculer la taille approximative de la requête
      const payloadSize = JSON.stringify(payload).length / (1024 * 1024);
      Logger.debug(`Approximate request size: ${payloadSize.toFixed(2)} MB`);

      if (payloadSize > 9.5) {
        Logger.warn(
          `Request is close to or exceeds the 10MB limit (${payloadSize.toFixed(2)} MB)`,
        );
      }

      // Essayer d'envoyer avec des options optimisées
      const response = await axios.post(
        'https://api.mailhub.sh/v1/send',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000, // Augmenter le timeout à 120 secondes pour les requêtes volumineuses
        },
      );

      Logger.debug(`Email sent successfully for quote ${quote_id}`);
      return response.data;
    } catch (error) {
      // Si l'erreur est "request entity too large", donner des informations supplémentaires
      if (error.response?.status === 413) {
        Logger.error(
          `Error 413 - Request Entity Too Large: The request size exceeds the mailhub.sh API limit for quote ${quote_id}.`,
        );
        Logger.error(
          `To solve this issue, you can:
          1. Reduce the size of attachments before sending
          2. Contact mailhub.sh support to increase your limit
          3. Install a library like 'compress-pdf' to compress PDFs before sending`,
        );
      }

      Logger.error(
        `Error sending email for quote ${quote_id}:`,
        JSON.stringify(error.response?.data || error.message),
      );
      throw error;
    }
  }

  async sendInvoiceEmail(quote: Quote | Invoice, pdfContent: any) {
    const API_KEY =
      this.configService.get('isProd') === true
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');

    try {
      // Vérifier la taille du PDF avant encodage
      const pdfSizeInMB = Buffer.from(pdfContent).length / (1024 * 1024);
      Logger.debug(
        `Taille du PDF avant encodage: ${pdfSizeInMB.toFixed(2)} MB`,
      );

      // Si la taille est supérieure à 7.5MB, on risque de dépasser la limite après encodage en base64
      if (pdfSizeInMB > 7.5) {
        Logger.debug(
          `Attention: La taille du PDF est importante (${pdfSizeInMB.toFixed(2)} MB)`,
        );
      }

      // Convertir l'arraybuffer en base64
      const base64Content = Buffer.from(pdfContent).toString('base64');
      const base64SizeInMB = base64Content.length / (1024 * 1024);
      Logger.debug(
        `Taille du PDF après encodage en base64: ${base64SizeInMB.toFixed(2)} MB`,
      );

      const invoiceNumber =
        typeof quote === 'object' && 'invoice_number' in quote
          ? quote.invoice_number
          : quote.id;

      const requestBody = {
        layout_identifier: 'tp-5eded5ab563d474d',
        variables: {
          invoice_number: invoiceNumber,
          account_name: quote.main_account ? quote.main_account.username : '',
          firstName: quote.client.firstname,
          name: quote.client.name,
        },
        from: 'info@sonarartists.fr',
        to: quote.client.email, // Utiliser l'email du client au lieu d'une adresse en dur
        subject: `Facture de ${quote.client.name}`,
        language: null,
        attachments: [
          {
            filename: `facture_${quote.id}_${quote.client.name}.pdf`,
            content: base64Content,
            contentType: 'application/pdf',
          },
        ],
      };

      // Calculer la taille approximative de la requête
      const payloadSize = JSON.stringify(requestBody).length / (1024 * 1024);
      Logger.debug(
        `Taille approximative de la requête: ${payloadSize.toFixed(2)} MB`,
      );

      if (payloadSize > 9.5) {
        Logger.warn(
          `La requête est proche ou dépasse la limite de 10MB (${payloadSize.toFixed(2)} MB)`,
        );
      }

      const response = await axios.post(
        'https://api.mailhub.sh/v1/send',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 60000, // Augmenter le timeout à 60 secondes pour les requêtes volumineuses
        },
      );

      Logger.debug(
        `Email de facture envoyé avec succès pour le devis ${quote.id}`,
      );
      return response.data;
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email de facture pour le devis ${quote.id}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async sendCreditNoteEmail(creditNote: Invoice, pdfContent: any) {
    const API_KEY =
      this.configService.get('isProd') === true
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');

    try {
      // Vérifier la taille du PDF avant encodage
      const pdfSizeInMB = Buffer.from(pdfContent).length / (1024 * 1024);
      Logger.debug(
        `Taille du PDF avant encodage: ${pdfSizeInMB.toFixed(2)} MB`,
      );

      // Si la taille est supérieure à 7.5MB, on risque de dépasser la limite après encodage en base64
      if (pdfSizeInMB > 7.5) {
        Logger.debug(
          `Attention: La taille du PDF est importante (${pdfSizeInMB.toFixed(2)} MB)`,
        );
      }

      // Convertir l'arraybuffer en base64
      const base64Content = Buffer.from(pdfContent).toString('base64');
      const base64SizeInMB = base64Content.length / (1024 * 1024);
      Logger.debug(
        `Taille du PDF après encodage en base64: ${base64SizeInMB.toFixed(2)} MB`,
      );

      const requestBody = {
        layout_identifier: 'tp-5eded5ab563d474d',
        variables: {
          invoice_number: creditNote.invoice_number,
          account_name: creditNote.main_account
            ? creditNote.main_account.username
            : '',
        },
        from: 'info@sonarartists.fr',
        to: creditNote.client.email, // Utiliser l'email du client au lieu d'une adresse en dur
        subject: `Facture de ${creditNote.client.name}`,
        language: null,
        attachments: [
          {
            filename: `facture_${creditNote.id}_${creditNote.client.name}.pdf`,
            content: base64Content,
            contentType: 'application/pdf',
          },
        ],
      };

      // Calculer la taille approximative de la requête
      const payloadSize = JSON.stringify(requestBody).length / (1024 * 1024);
      Logger.debug(
        `Taille approximative de la requête: ${payloadSize.toFixed(2)} MB`,
      );

      if (payloadSize > 9.5) {
        Logger.warn(
          `La requête est proche ou dépasse la limite de 10MB (${payloadSize.toFixed(2)} MB)`,
        );
      }

      const response = await axios.post(
        'https://api.mailhub.sh/v1/send',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 60000, // Augmenter le timeout à 60 secondes pour les requêtes volumineuses
        },
      );

      Logger.debug(
        `Email de facture envoyé avec succès pour le devis ${creditNote.id}`,
      );
      return response.data;
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email de facture pour le devis ${creditNote.id}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async sendVirementSepaEmail(
    to: string,
    accountOwner: string,
    pdfContent: string,
    virementId: number,
    cc: string | null = null,
  ) {
    const API_KEY = this.configService.get('isProd')
      ? this.configService.get('mailhub.api_key_prod')
      : this.configService.get('mailhub.api_key_dev');

    try {
      // Vérifier la taille du PDF (qui est déjà en base64)
      const pdfSizeInMB = pdfContent.length / (1024 * 1024);
      Logger.debug(`Taille du PDF en base64: ${pdfSizeInMB.toFixed(2)} MB`);

      // Si la taille est supérieure à 9.5MB, on risque de dépasser la limite
      if (pdfSizeInMB > 9.5) {
        Logger.warn(
          `Attention: La taille du PDF est très importante (${pdfSizeInMB.toFixed(2)} MB) et pourrait dépasser la limite`,
        );
      }

      const attachments = [
        {
          filename: `virement_sepa_${virementId}.pdf`,
          content: pdfContent,
          contentType: 'application/pdf',
        },
      ];

      const requestBody = {
        layout_identifier: 'tp-531d0f0745894797',
        variables: {
          transfer_id: virementId,
        },
        from: 'info@sonarartists.fr',
        to: to,
        cc: cc,
        subject: `Virement SEPA pour ${accountOwner}`,
        language: null,
        attachments,
      };

      // Calculer la taille approximative de la requête
      const payloadSize = JSON.stringify(requestBody).length / (1024 * 1024);
      Logger.debug(
        `Taille approximative de la requête: ${payloadSize.toFixed(2)} MB`,
      );

      if (payloadSize > 9.5) {
        Logger.warn(
          `La requête est proche ou dépasse la limite de 10MB (${payloadSize.toFixed(2)} MB)`,
        );
      }

      // Remplacer fetch par axios pour une meilleure gestion des erreurs et cohérence avec les autres méthodes
      const response = await axios.post(
        'https://api.mailhub.sh/v1/send',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 60000, // Augmenter le timeout à 60 secondes pour les requêtes volumineuses
        },
      );

      Logger.debug(
        `Email de virement SEPA envoyé avec succès pour ${accountOwner} (ID: ${virementId})`,
      );
      return response.data;
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email de virement SEPA pour ${accountOwner} (ID: ${virementId}):`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
