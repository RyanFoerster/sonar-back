import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Quote } from '../quote/entities/quote.entity';
import axios from 'axios';
import { Invoice } from '@/invoice/entities/invoice.entity';
import { Resend } from 'resend';
import { S3Service } from '@/services/s3/s3.service';
import { Event } from '@/event/entities/event.entity';
import * as QRCode from 'qrcode';
import { InvoiceService } from '@/invoice/invoice.service';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly invoiceService: InvoiceService,
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

    // const attachmentsToSend = attachments.map((attachment, index) => ({
    //   path: attachment,
    //   filename: attachmentNames[index],
    // }));

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: 'Acceptation de devis',
      // attachments: attachmentsToSend,
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
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">${isUpdate ? `Devis modifié par le projet ${project}` : 'Devis à confirmer'}</h1>
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
    const roleText = role === 'GROUP' ? 'Le projet' : 'Le client';
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

  // Méthode utilitaire pour formater les dates
  private formatDateString(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-BE');
  }

  // Nouvelle méthode pour générer le QR code de paiement
  private async generatePaymentQRCode(
    invoice: Invoice,
    client: any,
  ): Promise<string | null> {
    try {
      // Format EPC069-12 pour les virements SEPA
      const reference = `facture_${new Date().getFullYear()}/000${invoice.invoice_number}`;
      const qrData = [
        'BCD', // Service Tag
        '002', // Version
        '1', // Character Set
        'SCT', // Identification
        'GKCCBEBB', // BIC
        'Sonar Artists ASBL', // Nom du bénéficiaire
        'BE56103056426988', // IBAN
        `EUR${Math.abs(invoice.total).toFixed(2)}`, // Montant
        '', // Purpose (peut être laissé vide)
        reference, // Référence personnalisée
        `FACTURE ${new Date().getFullYear()}/000${invoice.invoice_number}`, // Description détaillée
      ].join('\n');

      console.log('Génération du QR code avec format EPC069-12');

      // Générer le QR code avec les options appropriées
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrData)}`;

      console.log('QR code URL généré:', qrCodeImageUrl);
      return qrCodeImageUrl;
    } catch (error) {
      console.error('Exception lors de la génération du QR code:', error);
      return null;
    }
  }

  private formatDateBelgium(date: Date): string {
    if (!date) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString(
      'fr-BE',
      options as Intl.DateTimeFormatOptions,
    );
  }

  async sendInvoiceEmail(quote: Invoice, pdfKey: string) {
    try {
      const pdfContent = await this.s3Service.getFile(pdfKey);

      // Déterminer l'environnement pour les liens
      const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
      const baseUrl =
        config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

      const cc = this.configService.get('isProd')
        ? 'vente-0700273583@soligere.clouddemat.be'
        : '';
      let invoiceNumber: number = quote.invoice_number;
      let invoiceDate: string = this.formatDateString(quote.invoice_date);
      let paymentDeadline: string = this.formatDateString(
        quote.payment_deadline,
      );

      // Déterminer le montant
      const amount = 'total' in quote ? quote.total : 0;

      // Créer une section pour les informations de paiement
      const paymentInfoHtml = `
        <div style="margin: 30px 0; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; background-color: #f9fafb;">
          <p style="color: #1f2937; font-weight: 600; margin-bottom: 15px; font-size: 16px;">Informations de paiement</p>
          <p style="color: #4b5563; margin: 5px 0;">IBAN: BE56 1030 5642 6988</p>
          <p style="color: #4b5563; margin: 5px 0;">BIC: GKCCBEBB</p>
          <p style="color: #4b5563; margin: 5px 0;">Montant: ${amount.toFixed(2)}€</p>
          <p style="color: #4b5563; margin: 5px 0;">Référence: Facture N°${new Date().getFullYear()}/000${invoiceNumber}</p>
        </div>
      `;

      // Variable pour stocker le QR code HTML
      let qrCodeHtml = '';

      // Essayer de générer le QR code seulement si c'est une facture
      if (quote.invoice_number) {
        try {
          console.log(
            'Tentative de génération du QR code pour la facture',
            invoiceNumber,
          );
          const qrCodeUrl = await this.generatePaymentQRCode(
            quote,
            quote.client,
          );

          if (qrCodeUrl) {
            console.log(
              "QR code généré avec succès, ajout à l'email avec URL:",
              qrCodeUrl,
            );

            // Créer le HTML pour le QR code avec URL externe
            qrCodeHtml = `
              <div style="text-align: center; margin: 20px 0;">
                <p style="color: #1f2937; font-weight: 600; margin-bottom: 15px;">Paiement par QR code</p>
                <img src="${qrCodeUrl}" alt="QR Code de paiement" style="width: 150px; height: 150px; border: 1px solid #e5e7eb;" />
                <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Scannez ce QR code avec votre application bancaire pour effectuer le paiement</p>
              </div>
            `;
          } else {
            console.log('Génération du QR code échouée, valeur null retournée');
          }
        } catch (error) {
          console.error(
            'Erreur lors de la génération/intégration du QR code:',
            error,
          );
        }
      }

      // Construire l'email
      console.log("Construction du corps de l'email...");

      // Note: ne pas modifier le reste du code de l'email
      const emailHtml = `
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
                  <p style="color: #1f2937; margin-bottom: 16px;">N°${new Date().getFullYear()}/000${invoiceNumber}</p>
                  
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Date :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${invoiceDate}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Date de paiement :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${paymentDeadline}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant total :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${amount.toFixed(2)}€</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Facturé à :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${quote.client.name}</p>
                </div>

                <!-- Informations de paiement -->
                ${paymentInfoHtml}

                <!-- QR Code de paiement si disponible -->
                ${qrCodeHtml}

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
      `;

      console.log("Envoi de l'email avec Resend...");
      const { data, error } = await this.resend.emails.send({
        from: 'info@sonarartists.be',
        to: quote.client.email,
        subject: `Facture N°${new Date().getFullYear()}/000${invoiceNumber}`,
        bcc: cc || undefined,
        html: emailHtml,
        attachments: [
          {
            filename: `facture_${new Date().getFullYear()}/000${invoiceNumber}.pdf`,
            content: pdfContent,
          },
        ],
      });

      if (error) {
        console.error('Erreur Resend:', error.message);
        throw error;
      }

      console.log('Email envoyé avec succès à', quote.client.email);
      return data;
    } catch (error) {
      console.error("Exception lors de l'envoi de l'email:", error);
      throw error;
    }
  }

  async sendCreditNoteEmail(creditNote: Invoice, pdfContent: Buffer) {
    // Déterminer l'environnement pour les liens et CC
    const isProd = this.configService.get('isProd') === true;
    const baseUrl = isProd
      ? 'https://sonarartists.be'
      : 'http://localhost:4200';
    const cc = isProd ? 'vente-0700273583@soligere.clouddemat.be' : '';

    const creditNoteNumber = creditNote.invoice_number;
    // Utilisation de || new Date() pour gérer le cas où invoice_date pourrait être null/undefined
    const creditNoteDate = this.formatDateString(
      creditNote.invoice_date || new Date(),
    );
    // Assurez-vous que total existe sur Invoice, sinon mettre 0
    const amount = 'total' in creditNote ? creditNote.total : 0;

    try {
      // Construire l'email
      console.log("Construction du corps de l'email pour la note de crédit...");

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Note de crédit Sonar Artists</title>
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
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #C8C04D; margin: 0;">Note de Crédit</h1>
                  <div style="text-align: right;">
                    <p style="color: #4b5563; margin: 0;">${creditNote.client.name}</p>
                    <p style="color: #4b5563; margin: 0;">${creditNote.client.email}</p>
                  </div>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e client·e,</p>

                <!-- Corps du message -->
                <p style="color: #1f2937; margin-bottom: 24px;">Veuillez trouver ci-joint votre note de crédit :</p>

                <!-- Détails de la note de crédit -->
                <div style="margin-bottom: 24px;">
                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Numéro de note de crédit :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">N°${new Date().getFullYear()}/000${creditNoteNumber}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Date :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${creditNoteDate}</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Montant total :</span></p>
                  <p style="color: #1f2937; margin-bottom: 16px;">${amount.toFixed(2)}€</p>

                  <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Associée à :</span></p>
                  <p style="color: #1f2937; margin-bottom: 24px;">${creditNote.client.name}</p>
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
      `;

      console.log("Envoi de l'email de note de crédit avec Resend...");
      const { data, error } = await this.resend.emails.send({
        from: 'info@sonarartists.be',
        to: creditNote.client.email,
        bcc: cc || undefined, // Utilisation de bcc ici pour la cohérence
        subject: `Note de crédit N°${creditNoteNumber} - Sonar Artists`,
        html: emailHtml,
        attachments: [
          {
            filename: `note_credit_${creditNoteNumber}.pdf`, // Nom de fichier simplifié
            content: pdfContent, // Passer le Buffer directement
          },
        ],
      });

      if (error) {
        Logger.error(
          `Erreur Resend lors de l'envoi de l'email de note de crédit N° ${creditNoteNumber}:`,
          error.message,
        );
        throw error;
      }

      Logger.log(
        `Email de note de crédit N° ${creditNoteNumber} envoyé avec succès à ${creditNote.client.email}`,
      );
      return data;
    } catch (error) {
      Logger.error(
        `Exception lors de l'envoi de l'email de note de crédit N° ${creditNoteNumber}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Relancer l'erreur pour que l'appelant puisse la gérer
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
      html: `        <!DOCTYPE html>
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

  async sendQuoteReminderEmail(
    to: string,
    firstName: string,
    quote_id: number,
    role: 'GROUP' | 'CLIENT',
    email: string,
    date: string,
    comment: string,
    amount: number,
    client: string,
    validationDeadline: string,

    name?: string,
    attachments?: string[],
    attachmentNames?: string[],
    project?: string,
  ) {
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('isProd') === true ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: 'Rappel - Devis à confirmer avant expiration',
      html: `        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rappel - Devis à confirmer</title>
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
              <div style="border: 4px solid #ef4444; padding: 32px; background-color: #ffffff;">
                <!-- Titre principal -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #ef4444; margin: 0;">Rappel - Devis à confirmer</h1>
                  <div style="text-align: right;">
                    ${firstName ? `<p style="color: #4b5563; margin: 0;">${firstName} ${name || ''} ${role ? `- ${role}` : ''}</p>` : ''}
                    ${email ? `<p style="color: #4b5563; margin: 0;">${email}</p>` : ''}
                  </div>
                </div>

                <!-- Message d'urgence -->
                <div style="background-color: #fef2f2; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <p style="color: #ef4444; font-weight: 600; margin: 0;">
                    Attention ! Ce devis expire demain (${validationDeadline}). Veuillez le confirmer ou le refuser avant cette date.
                  </p>
                </div>

                <!-- Salutation -->
                <p style="color: #1f2937; margin-bottom: 24px;">Chèr·e ${firstName} ${name || ''},</p>

                <!-- Corps du message -->
                <p style="color: #1f2937; margin-bottom: 24px;">Nous vous rappelons que le devis suivant est toujours en attente de votre confirmation :</p>

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
}
