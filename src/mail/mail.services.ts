import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Quote } from '../quote/entities/quote.entity';
import axios from 'axios';
import { Invoice } from '@/invoice/entities/invoice.entity';
import { Resend } from 'resend';
import { S3Service } from '@/services/s3/s3.service';
import { Event } from '@/event/entities/event.entity';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  private readonly resend = new Resend(
    this.configService.get('resend.api_key'),
  );

  async sendPasswordResetEmail(
    to: string,
    token: string,
    firstName: string,
    name: string,
    subject: string = 'Réinitialisation du mot de passe',
  ) {
    // URL du logo - assurez-vous que cette URL est accessible publiquement
    const logoUrl =
      this.configService.get('isProd') === true
        ? 'https://sonarartists.be/logo-SONAR.png'
        : 'http://localhost:4200/logo-SONAR.png';

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
            <!-- En-tête avec logo -->
            <tr>
              <td align="center" style="padding: 30px 20px; background-color: #000000;">
                <img src="${logoUrl}" alt="Sonar Artists" style="max-width: 180px; height: auto;">
              </td>
            </tr>
            
            <!-- Contenu principal -->
            <tr>
              <td style="padding: 40px 30px;">
                <h1 style="color: #333333; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 600;">Bonjour ${firstName} ${name}</h1>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour continuer.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${this.configService.get('isProd') === true ? 'https://sonarartists.be' : 'http://localhost:4200'}/forgotten-password?token=${token}" 
                     style="display: inline-block; background-color: #C8C04D; color: #000000; font-weight: 600; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 16px; transition: background-color 0.3s ease;">
                    Réinitialiser mon mot de passe
                  </a>
                </div>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
                </p>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Ce lien expirera dans 24 heures pour des raisons de sécurité.
                </p>
              </td>
            </tr>
            
            <!-- Pied de page -->
            <tr>
              <td style="padding: 20px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; text-align: center;">
                <p style="color: #888888; font-size: 14px; margin: 0;">
                  © ${new Date().getFullYear()} Sonar Artists. Tous droits réservés.
                </p>
                <p style="color: #888888; font-size: 12px; margin-top: 10px;">
                  Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:info@sonarartists.be" style="color: #C8C04D; text-decoration: none;">info@sonarartists.be</a>
                </p>
              </td>
            </tr>
          </table>
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
    isUpdate?: boolean,
  ) {
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
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
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">${isUpdate ? `Devis modifié par le groupe ${project}` : 'Devis à confirmer'}</h1>
                  <div style="text-align: right;">
                    ${firstName ? `<p style="color: #4b5563; margin: 0;">${firstName} ${name || ''} ${role ? `- ${role}` : ''}</p>` : ''}
                    ${email ? `<p style="color: #4b5563; margin: 0;">${email}</p>` : ''}
                  </div>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e ${firstName} ${name || ''},</p>

                <!-- Corps du message -->
                ${
                  isUpdate
                    ? `<p style="color: #1f2937; margin-bottom: 24px;">Voici le devis modifié relatif à votre commande :</p>`
                    : `<p style="color: #1f2937; margin-bottom: 24px;">Voici le devis relatif à votre commande :</p>`
                }

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

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant HTVA :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${amount.toFixed(2) || ''}€</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">À facturer à :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${client || ''}</p>
                </div>

                <!-- Vérification de commande -->
                <p style="text-align: center; color: #6b7280; margin-bottom: 16px;">Vérifiez votre commande*</p>

                <p style="color: #1f2937; margin-bottom: 24px;">* Cliquez sur ce lien, vous aurez le choix de <span style="font-weight: 600;">confirmer</span> ou <span style="font-weight: 600;">refuser</span> le devis.</p>

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

                  <p style="color: #C8C04D; margin-bottom: 4px;">+32 498 62 45 65</p>
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

  async sendQuoteStatusUpdateEmail(
    to: string,
    firstName: string,
    quote_id: number,
    quote_number: string,
    status: 'accepted' | 'refused',
    role: 'GROUP' | 'CLIENT',
    project?: string,
    amount?: number,
    date?: string,
    client?: string,
  ) {
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    const statusText = status === 'accepted' ? 'accepté' : 'refusé';
    const statusColor = status === 'accepted' ? '#10b981' : '#ef4444';
    const roleText = role === 'GROUP' ? 'Le groupe' : 'Le client';
    const otherRoleParam = role === 'GROUP' ? 'CLIENT' : 'GROUP';

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: `Devis ${statusText} - D-${quote_number}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Statut du devis mis à jour</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333; min-height: 100vh;">
          <div style="min-height: 100%; display: flex; justify-content: space-between; max-width: 600px; margin: 0 auto;">
            <div style="width: 100%;">
              <!-- En-tête avec logo Sonar -->
              <div style="background-color: #ffffff; padding: 16px; display: flex; align-items: center; gap: 8px;">
                <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar" style="width: 32px; height: auto;" />
                <img src="https://sonarartists.be/sonar-texte.png" alt="Sonar" style="width: 80px; height: auto;" />
              </div>

              <!-- Contenu principal avec bordure -->
              <div style="border: 4px solid ${statusColor}; padding: 32px; background-color: #ffffff;">
                <!-- Titre principal -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: ${statusColor}; margin: 0;">Devis ${statusText} par ${roleText}</h1>
                  <div style="text-align: right;">
                    <p style="color: #4b5563; margin: 0;">Devis N° D-${quote_number}</p>
                  </div>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e ${firstName},</p>

                <!-- Corps du message -->
                <p style="color: #1f2937; margin-bottom: 24px;">
                  ${roleText} a <strong>${statusText}</strong> le devis N° D-${quote_number}.
                </p>

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
                  
                  ${
                    date
                      ? `
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Dates :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">${date}</p>
                  `
                      : ''
                  }

                  ${
                    amount
                      ? `
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant HTVA :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">${amount.toFixed(2)}€</p>
                  `
                      : ''
                  }

                  ${
                    client
                      ? `
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">À facturer à :</span></p>
                    <p style="color: #1f2937; margin-bottom: 24px;">${client}</p>
                  `
                      : ''
                  }
                </div>

                <!-- Message de statut -->
                <div style="background-color: ${status === 'accepted' ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${statusColor}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <p style="color: ${statusColor}; font-weight: 600; margin: 0;">
                    ${
                      status === 'accepted'
                        ? 'Le devis a été accepté. Nous vous remercions pour votre confiance.'
                        : "Le devis a été refusé. Si vous avez des questions, n'hésitez pas à nous contacter."
                    }
                  </p>
                </div>

                <!-- Bouton d'action -->
                <div style="display: flex; justify-content: center; margin-top: 24px; margin-bottom: 24px;">
                  <a href="${baseUrl}/quote-decision?quote_id=${quote_id}&role=${otherRoleParam}" target="_blank" style="background-color: #6b7280; color: #ffffff; padding: 8px 24px; border-radius: 9999px; font-size: 1.125rem; font-weight: 600; text-decoration: none; display: inline-block;">
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

                  <p style="color: #C8C04D; margin-bottom: 4px;">+32 498 62 45 65</p>
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

  async sendInvoiceEmail(quote: Quote | Invoice, pdfKey: string) {
    const pdfContent = await this.s3Service.getFile(pdfKey);

    // Déterminer l'environnement pour les liens
    const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    // Déterminer le numéro de facture
    const invoiceNumber =
      'invoice_number' in quote ? quote.invoice_number : quote.id;

    // Déterminer la date de la facture
    const invoiceDate =
      'invoice_date' in quote ? this.formatDateString(quote.invoice_date) : '';

    // Déterminer le montant
    const amount = 'total' in quote ? quote.total : 0;

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to: quote.client.email,
      subject: `Facture N°${invoiceNumber} - Sonar Artists`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Facture Sonar Artists</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333; min-height: 100vh;">
          <div style="min-height: 100%; display: flex; justify-content: space-between; max-width: 600px; margin: 0 auto;">
            <div style="width: 100%;">
              <!-- En-tête avec logo Sonar -->
              <div style="background-color: #ffffff; padding: 16px; display: flex; align-items: center; gap: 8px;">
                <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar" style="width: 32px; height: auto;" />
                <img src="https://sonarartists.be/sonar-texte.png" alt="Sonar" style="width: 80px; height: auto;" />
              </div>

              <!-- Contenu principal avec bordure jaune -->
              <div style="border: 4px solid #C8C04D; padding: 32px; background-color: #ffffff;">
                <!-- Titre principal -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">Facture</h1>
                  <div style="text-align: right;">
                    <p style="color: #4b5563; margin: 0;">${quote.client.name}</p>
                    <p style="color: #4b5563; margin: 0;">${quote.client.email}</p>
                  </div>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e client·e,</p>

                <!-- Corps du message -->
                <p style="color: #1f2937; margin-bottom: 24px;">Veuillez trouver ci-joint votre facture :</p>

                <!-- Détails de la facture -->
                <div style="margin-bottom: 24px;">
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Numéro de facture :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">N°${invoiceNumber}</p>
                  
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Date :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${invoiceDate}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant total :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${amount.toFixed(2)}€</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Facturé à :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${quote.client.name}</p>
                </div>

                <!-- Message de paiement -->
                <p style="color: #1f2937; margin-bottom: 24px;">Merci de bien vouloir procéder au paiement selon les modalités indiquées sur la facture.</p>

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

                  <p style="color: #C8C04D; margin-bottom: 4px;">+32 498 62 45 65</p>
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
      attachments: [
        {
          filename: `facture_${invoiceNumber}_${quote.client.name}.pdf`,
          content: pdfContent,
        },
      ],
    });

    if (error) {
      Logger.error('Error:', error.message);
      throw error;
    }

    return data;
  }

  // Méthode utilitaire pour formater les dates
  private formatDateString(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-BE');
  }

  async sendCreditNoteEmail(creditNote: Invoice, pdfContent: any) {
    const API_KEY =
      this.configService.get('isProd') === true
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');

    try {
      // Vérifier la taille du PDF avant encodage
      const pdfSizeInMB = Buffer.from(pdfContent).length / (1024 * 1024);

      // Si la taille est supérieure à 7.5MB, on risque de dépasser la limite après encodage en base64
      if (pdfSizeInMB > 7.5) {
      }

      // Convertir l'arraybuffer en base64
      const base64Content = Buffer.from(pdfContent).toString('base64');
      const base64SizeInMB = base64Content.length / (1024 * 1024);

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
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'info@sonarartists.be',
        to,
        cc: cc || undefined,
        subject: `Virement SEPA pour ${accountOwner}`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Virement SEPA</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333; min-height: 100vh;">
            <div style="min-height: 100%; display: flex; justify-content: space-between; max-width: 600px; margin: 0 auto;">
              <div style="width: 100%;">
                <!-- En-tête avec logo Sonar -->
                <div style="background-color: #ffffff; padding: 16px; display: flex; align-items: center; gap: 8px;">
                  <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar" style="width: 32px; height: auto;" />
                  <img src="https://sonarartists.be/sonar-texte.png" alt="Sonar" style="width: 80px; height: auto;" />
                </div>

                <!-- Contenu principal avec bordure jaune -->
                <div style="border: 4px solid #C8C04D; padding: 32px; background-color: #ffffff;">
                  <!-- Titre principal -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                    <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">Virement SEPA</h1>
                    <div style="text-align: right;">
                      <p style="color: #4b5563; margin: 0;">Référence: #${virementId}</p>
                    </div>
                  </div>

                  <!-- Salutation -->
                  <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e ${accountOwner},</p>

                  <!-- Corps du message -->
                  <p style="color: #1f2937; margin-bottom: 24px;">Veuillez trouver ci-joint votre ordre de virement SEPA :</p>

                  <!-- Détails du virement -->
                  <div style="margin-bottom: 24px;">
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Référence du virement :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">#${virementId}</p>
                    
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Bénéficiaire :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">${accountOwner}</p>
                  </div>

                  <!-- Message d'information -->
                  <div style="background-color: #f0fdf4; border: 1px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="color: #10b981; font-weight: 600; margin: 0;">
                      Le virement a été initié. Vous trouverez tous les détails dans le document PDF joint à cet email.
                    </p>
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

                    <p style="color: #C8C04D; margin-bottom: 4px;">+32 498 62 45 65</p>
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
        attachments: [
          {
            filename: `virement_sepa_${virementId}.pdf`,
            content: Buffer.from(pdfContent, 'base64'),
          },
        ],
      });

      if (error) {
        Logger.error('Error:', error.message);
        throw error;
      }

      return data;
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email de virement SEPA pour ${accountOwner} (ID: ${virementId}):`,
        error.message,
      );
      throw error;
    }
  }

  async sendEventInvitationEmail(
    to: string,
    name: string,
    event: Event,
    token: string,
  ) {
    const baseUrl =
      this.configService.get('isProd') === true
        ? 'https://sonarartists.be'
        : 'http://localhost:4200';

    const invitationLink = `${baseUrl}/event-invitation?token=${token}`;

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: `Invitation à l'événement : ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation à un événement</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
            <!-- En-tête avec logo -->
            <tr>
              <td align="center" style="padding: 30px 20px; background-color: #000000;">
                <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar Artists" style="max-width: 180px; height: auto;">
              </td>
            </tr>
            
            <!-- Contenu principal -->
            <tr>
              <td style="padding: 40px 30px;">
                <h1 style="color: #333333; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 600;">Invitation à un événement</h1>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Bonjour ${name},
                </p>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Vous avez été invité(e) à l'événement suivant :
                </p>
                
                <div style="background-color: #f8f8f8; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                  <h2 style="color: #C8C04D; font-size: 20px; margin-top: 0; margin-bottom: 15px;">${event.title}</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Date de début :</strong> ${new Date(event.startDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Date de fin :</strong> ${new Date(event.endDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Rendez-vous à :</strong> ${new Date(event.meetupDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  ${
                    event.location
                      ? `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Lieu :</strong> ${event.location}
                  </p>`
                      : ''
                  }
                  
                  ${
                    event.description
                      ? `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 0;">
                    <strong>Description :</strong> ${event.description}
                  </p>`
                      : ''
                  }
                </div>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Merci de nous indiquer si vous pourrez y participer en cliquant sur le bouton ci-dessous :
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" 
                     style="display: inline-block; background-color: #C8C04D; color: #000000; font-weight: 600; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 16px; transition: background-color 0.3s ease;">
                    Répondre à l'invitation
                  </a>
                </div>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Si vous avez des questions concernant cet événement, n'hésitez pas à contacter les organisateurs.
                </p>
              </td>
            </tr>
            
            <!-- Pied de page -->
            <tr>
              <td style="padding: 20px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; text-align: center;">
                <p style="color: #888888; font-size: 14px; margin: 0;">
                  © ${new Date().getFullYear()} Sonar Artists. Tous droits réservés.
                </p>
                <p style="color: #888888; font-size: 12px; margin-top: 10px;">
                  Ce message a été envoyé via la plateforme Sonar Artists.
                </p>
              </td>
            </tr>
          </table>
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

  async sendEventReminderEmail(
    to: string,
    name: string,
    event: Event,
    token: string,
  ) {
    const baseUrl =
      this.configService.get('isProd') === true
        ? 'https://sonarartists.be'
        : 'http://localhost:4200';

    const invitationLink = `${baseUrl}/event-invitation?token=${token}`;

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: `Rappel : Invitation à l'événement ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rappel d'invitation à un événement</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f4f4f4; color: #333333;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
            <!-- En-tête avec logo -->
            <tr>
              <td align="center" style="padding: 30px 20px; background-color: #000000;">
                <img src="https://sonarartists.be/logo-SONAR.png" alt="Sonar Artists" style="max-width: 180px; height: auto;">
              </td>
            </tr>
            
            <!-- Contenu principal -->
            <tr>
              <td style="padding: 40px 30px;">
                <h1 style="color: #333333; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 600;">Rappel : Invitation à un événement</h1>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Bonjour ${name},
                </p>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Nous n'avons pas encore reçu votre réponse concernant l'événement suivant :
                </p>
                
                <div style="background-color: #f8f8f8; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                  <h2 style="color: #C8C04D; font-size: 20px; margin-top: 0; margin-bottom: 15px;">${event.title}</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Date de début :</strong> ${new Date(event.startDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Date de fin :</strong> ${new Date(event.endDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Rendez-vous à :</strong> ${new Date(event.meetupDateTime).toLocaleString('fr-FR')}
                  </p>
                  
                  ${
                    event.location
                      ? `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    <strong>Lieu :</strong> ${event.location}
                  </p>`
                      : ''
                  }
                </div>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Merci de nous indiquer si vous pourrez y participer en cliquant sur le bouton ci-dessous :
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" 
                     style="display: inline-block; background-color: #C8C04D; color: #000000; font-weight: 600; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 16px; transition: background-color 0.3s ease;">
                    Répondre à l'invitation
                  </a>
                </div>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Si vous avez des questions concernant cet événement, n'hésitez pas à contacter les organisateurs.
                </p>
              </td>
            </tr>
            
            <!-- Pied de page -->
            <tr>
              <td style="padding: 20px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; text-align: center;">
                <p style="color: #888888; font-size: 14px; margin: 0;">
                  © ${new Date().getFullYear()} Sonar Artists. Tous droits réservés.
                </p>
                <p style="color: #888888; font-size: 12px; margin-top: 10px;">
                  Ce message a été envoyé via la plateforme Sonar Artists.
                </p>
              </td>
            </tr>
          </table>
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
}
