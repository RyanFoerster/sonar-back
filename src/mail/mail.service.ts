import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../users/entities/user.entity';
import { Resend } from 'resend';
@Injectable()
export class MailService {
  private readonly resend = new Resend(
    this.configService.get('resend.api_key'),
  );
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(
    to: string,
    token: string,
    firstName: string,
    name: string,
    subject: string = 'Réinitialisation du mot de passe',
  ) {
    // URL du logo - assurez-vous que cette URL est accessible publiquement
    const logoUrl =
      this.configService.get('stage') === 'prod'
        ? 'https://sonarartists.fr/logo-SONAR.png'
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
                  <a href="${this.configService.get('stage') === 'prod' ? 'https://sonarartists.fr' : 'http://localhost:4200'}/forgotten-password?token=${token}" 
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

    Logger.debug('Stylized email sent:', data);
    return data;
  }

  async sendDevisAcceptationEmail(
    to: string,
    firstName: string,
    quote_id: number,
    role: 'GROUP' | 'CLIENT',
    name?: string,
    email?: string,
    date?: string,
    comment?: string,
    amount?: number,
    client?: string,
    project?: string,
    location?: string,
  ) {
    // Déterminer l'environnement pour les liens
    const config = this.configService.get('stage') === 'prod' ? 'PROD' : 'DEV';
    const baseUrl =
      config === 'PROD' ? 'https://sonarartists.be' : 'http://localhost:4200';

    const { data, error } = await this.resend.emails.send({
      from: 'info@sonarartists.be',
      to,
      subject: 'Acceptation de devis',
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
              <div style="border: 4px solid #ef4444; padding: 32px; background-color: #ffffff;">
                <!-- Titre principal -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                  <h1 style="font-size: 1.875rem; font-weight: 700; color: #ef4444; margin: 0;">Devis à confirmer</h1>
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

                  ${
                    location
                      ? `
                    <p style="color: #1f2937; margin-bottom: 8px;"><span style="font-weight: 600;">Lieu :</span></p>
                    <p style="color: #1f2937; margin-bottom: 16px;">${location}</p>
                  `
                      : ''
                  }
                  
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

                  <p style="color: #ef4444; margin-bottom: 4px;">+32 2 542 19 31</p>
                  <p style="color: #ef4444; margin-bottom: 4px;">info@sonarartists.be</p>
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

    Logger.debug('Devis acceptance email sent:', data);
    return data;
  }

  async sendInvoiceEmail(quote: Quote, user: User, pdfContent: any) {
    const API_KEY =
      this.configService.get('stage') === 'prod'
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');

    try {
      const requestBody = {
        layout_identifier: 'tp-5eded5ab563d474d',
        variables: {
          invoice_number: quote.invoice.id,
          account_name: quote.main_account ? quote.main_account.username : '',
        },
        from: 'info@sonarartists.fr',
        to: 'ryanfoerster@outlook.be',
        subject: `Facture de ${quote.client.name}`,
        language: null,
        attachments: [
          {
            filename: `facture_${quote.id}_${quote.client.name}.pdf`,
            content: pdfContent,
            contentType: 'application/pdf',
          },
        ],
      };

      fetch(`https://api.mailhub.sh/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }).then();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async sendVirementSepaEmail(
    to: string,
    accountOwner: string,
    pdfContent: string,
    virementId: number,
    cc?: string | null,
  ) {
    const API_KEY = this.configService.get('isProd')
      ? this.configService.get('mailhub.api_key_prod')
      : this.configService.get('mailhub.api_key_dev');

    try {
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

      fetch(`https://api.mailhub.sh/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }).then((data) => console.log(data));
    } catch (error) {
      Logger.error('Error:', error);
      throw error;
    }
  }
}
