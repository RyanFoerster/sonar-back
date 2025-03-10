import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../users/entities/user.entity';
import axios from 'axios';
import { Invoice } from '@/invoice/entities/invoice.entity';
import { Resend } from 'resend';
@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  private readonly resend = new Resend(
    this.configService.get('resend.api_key'),
  );

  // async sendPasswordResetEmail(
  //   to: string,
  //   token: string,
  //   firstName: string,
  //   name: string,
  // ) {
  //   const API_KEY =
  //     this.configService.get('stage') === 'prod'
  //       ? this.configService.get('mailhub.api_key_prod')
  //       : this.configService.get('mailhub.api_key_dev');
  //   try {
  //     Logger.debug('API_KEY', API_KEY);
  //     fetch(`https://api.mailhub.sh/v1/send`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${API_KEY}`,
  //       },
  //       body: JSON.stringify({
  //         layout_identifier: 'tp-dc76ec2fba7f4b04',
  //         variables: {
  //           firstName,
  //           name,
  //           resetToken: token,
  //         },
  //         from: 'info@sonarartists.fr',
  //         to,
  //         subject: 'Réinitialisation du mot de passe',
  //         language: null,
  //       }),
  //     }).then((data) => console.log(data));
  //   } catch (error) {
  //     console.error('Error:', error);
  //   }
  // }

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
    attachments?: string[],
    attachmentNames?: string[],
    project?: string,
  ) {
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('stage') === 'prod' ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    const attachmentsToSend = attachments.map((attachment, index) => ({
      path: attachment,
      filename: attachmentNames[index],
    }));

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: 'Acceptation de devis',
      attachments: attachmentsToSend,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Devis à confirmer</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333; min-height: 100vh;">
          <div style="min-height: 100%; display: flex; justify-content: space-between; max-width: 600px; margin: 0 auto;">
            <div style="width: 100%;">
              <!-- En-tête avec logo Sonar -->
              <div style="background-color: #ffffff; padding: 16px; display: flex; align-items: center; gap: 8px;">
                <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar" style="width: 32px; height: auto;" />
                <img src="https://sonarartists.be/sonar-texte.png" alt="Sonar" style="width: 80px; height: auto;" />
              </div>

              <!-- Contenu principal avec bordure rouge -->
              <div style="border: 4px solid #C8C04D; padding: 32px; background-color: #ffffff;">
                <!-- Titre principal -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">Devis à confirmer</h1>
                  <div style="text-align: right;">
                    ${firstName ? `<p style="color: #4b5563; margin: 0;">${firstName} ${name || ''} ${role ? `- ${role}` : ''}</p>` : ''}
                    ${email ? `<p style="color: #4b5563; margin: 0;">${email}</p>` : ''}
                  </div>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e ${firstName} ${name || ''},</p>

                <!-- Corps du message -->
                <p style="color: #1f2937; margin-bottom: 24px;">Voici mon devis relatif à votre commande :</p>

                <!-- Détails du devis -->
                <div style="margin-bottom: 24px;">
                  ${
                    project
                      ? `
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Nom du projet :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">${project}</p>
                  `
                      : ''
                  }
                  
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Dates :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${date || ''}</p>
                  
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Info complémentaire :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${comment || ''}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant HTVA :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${amount || ''}€</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">À facturer à :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${client || ''}</p>
                </div>

                <!-- Vérification de commande -->
                <p style="text-align: center; color: #6b7280; margin-bottom: 16px;">Vérifiez votre commande*</p>

                <p style="color: #1f2937; margin-bottom: 24px;">* Cliquez sur ce lien, vous aurez le choix de <span style="font-weight: 600;">confirmer</span> ou <span style="font-weight: 600;">refuser</span> le devis (en demandant une <span style="font-weight: 600;">éventuelle modification</span>).</p>

                <!-- Bouton d'action -->
                <div style="display: flex; justify-content: center; margin-top: 24px; margin-bottom: 24px;">
                  <a href="${baseUrl}/quote-decision?quote_id=${quote_id}&role=${role}" target="_blank" style="background-color: #ef4444; color: #ffffff; padding: 8px 24px; border-radius: 9999px; font-size: 1.125rem; font-weight: 600; text-decoration: none; display: inline-block;">
                    Voir le devis
                  </a>
                </div>

                <!-- Signature -->
                <p style="color: #1f2937; margin-bottom: 8px;">Je vous remercie pour votre confiance,</p>
                <p style="color: #1f2937; margin-bottom: 32px;">L'équipe Sonar Artists</p>

                <!-- Pied de page -->
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db;">
                  <p style="color: #4b5563; margin-bottom: 4px;">powered by</p>
                  <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0;">
                    <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar" style="width: 32px; height: auto;" />
                    <img src="https://sonarartists.be/sonar-texte.png" alt="Sonar" style="width: 80px; height: auto;" />
                  </div>

                  <p style="color: #C8C04D; margin-bottom: 4px;">+32 2 542 19 31</p>
                  <p style="color: #C8C04D; margin-bottom: 4px;">info@sonarartists.be</p>
                  <p style="color: #4b5563; margin-bottom: 4px;">Rue Francisco Ferrer 6</p>
                  <p style="color: #4b5563; margin-bottom: 0;">4460 GRÂCE-BERLEUR</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      Logger.error('Error:', error.message);
      throw error;
    }

    return data;
  }

  async sendInvoiceEmail(quote: Quote | Invoice, pdfContent: any) {
    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to: quote.client.email,
      subject: `Facture de ${quote.client.name}`,
      html: `
        <p>Facture de ${quote.client.name}</p>
      `,
      attachments: [
        {
          filename: `facture_${quote.id}_${quote.client.name}.pdf`,
          content: pdfContent,
        },
      ],
    });

    if (error) {
      Logger.error('Error:', error.message);
      throw error;
    }
  }

  // async sendInvoiceEmail(quote: Quote | Invoice, pdfContent: any) {
  //   const API_KEY =
  //     this.configService.get('isProd') === true
  //       ? this.configService.get('mailhub.api_key_prod')
  //       : this.configService.get('mailhub.api_key_dev');

  //   try {
  //     // Vérifier la taille du PDF avant encodage
  //     const pdfSizeInMB = Buffer.from(pdfContent).length / (1024 * 1024);
  //     Logger.debug(
  //       `Taille du PDF avant encodage: ${pdfSizeInMB.toFixed(2)} MB`,
  //     );

  //     // Si la taille est supérieure à 7.5MB, on risque de dépasser la limite après encodage en base64
  //     if (pdfSizeInMB > 7.5) {
  //       Logger.debug(
  //         `Attention: La taille du PDF est importante (${pdfSizeInMB.toFixed(2)} MB)`,
  //       );
  //     }

  //     // Convertir l'arraybuffer en base64
  //     const base64Content = Buffer.from(pdfContent).toString('base64');
  //     const base64SizeInMB = base64Content.length / (1024 * 1024);
  //     Logger.debug(
  //       `Taille du PDF après encodage en base64: ${base64SizeInMB.toFixed(2)} MB`,
  //     );

  //     const invoiceNumber =
  //       typeof quote === 'object' && 'invoice_number' in quote
  //         ? quote.invoice_number
  //         : quote.id;

  //     const requestBody = {
  //       layout_identifier: 'tp-5eded5ab563d474d',
  //       variables: {
  //         invoice_number: invoiceNumber,
  //         account_name: quote.main_account ? quote.main_account.username : '',
  //         firstName: quote.client.firstname,
  //         name: quote.client.name,
  //       },
  //       from: 'info@sonarartists.fr',
  //       to: quote.client.email, // Utiliser l'email du client au lieu d'une adresse en dur
  //       subject: `Facture de ${quote.client.name}`,
  //       language: null,
  //       attachments: [
  //         {
  //           filename: `facture_${quote.id}_${quote.client.name}.pdf`,
  //           content: base64Content,
  //           contentType: 'application/pdf',
  //         },
  //       ],
  //     };

  //     // Calculer la taille approximative de la requête
  //     const payloadSize = JSON.stringify(requestBody).length / (1024 * 1024);
  //     Logger.debug(
  //       `Taille approximative de la requête: ${payloadSize.toFixed(2)} MB`,
  //     );

  //     if (payloadSize > 9.5) {
  //       Logger.warn(
  //         `La requête est proche ou dépasse la limite de 10MB (${payloadSize.toFixed(2)} MB)`,
  //       );
  //     }

  //     const response = await axios.post(
  //       'https://api.mailhub.sh/v1/send',
  //       requestBody,
  //       {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${API_KEY}`,
  //         },
  //         maxBodyLength: Infinity,
  //         maxContentLength: Infinity,
  //         timeout: 60000, // Augmenter le timeout à 60 secondes pour les requêtes volumineuses
  //       },
  //     );

  //     Logger.debug(
  //       `Email de facture envoyé avec succès pour le devis ${quote.id}`,
  //     );
  //     return response.data;
  //   } catch (error) {
  //     Logger.error(
  //       `Erreur lors de l'envoi de l'email de facture pour le devis ${quote.id}:`,
  //       error.response?.data || error.message,
  //     );
  //     throw error;
  //   }
  // }

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
