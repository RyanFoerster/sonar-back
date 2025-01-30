import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(
    to: string,
    token: string,
    firstName: string,
    name: string,
  ) {
    /*const resetLink = `http://yourapp.com/reset-password?token=${token}`;
    const mailOptions = {
      from: 'Auth-backend service',
      to,
      subject: 'Password reset request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`
    }

    await this.transporter.sendMail(mailOptions);*/
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
    name?: string,
  ) {
    const API_KEY = this.configService.get('isProd')
      ? this.configService.get('mailhub.api_key_prod')
      : this.configService.get('mailhub.api_key_dev');

    Logger.debug('API_KEY', API_KEY);
    Logger.debug('isProd', this.configService.get('isProd'));

    const config = this.configService.get('isProd') ? 'PROD' : 'DEV';

    Logger.debug('config', config);

    try {
      fetch(`https://api.mailhub.sh/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          layout_identifier: 'tp-3fab551a26be4e9a',
          variables: {
            firstName,
            name,
            quote_id,
            role,
            config,
          },
          from: 'info@sonarartists.fr',
          to,
          subject: "Demande d'acceptation de devis",
          language: null,
        }),
      }).then((data) => console.log(data));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async sendInvoiceEmail(quote: Quote, user: User, pdfContent: any) {
    const API_KEY =
      this.configService.get('stage') === 'prod'
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');

    try {
      // Extraire le contenu base64 du Data URI
      // const base64Content = pdfContent.split(',')[1];

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
          // Authorization: `Bearer ${API_KEY}`,
          Authorization: `Bearer mh_live_65df249bc37d49aaa3505171f790c70dc5d6fa7fa76441f0ba921ae7e304f9fd`,
        },
        body: JSON.stringify(requestBody),
      }).then((data) => console.log(data));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async sendVirementSepaEmail(
    to: string,
    accountOwner: string,
    projectName: string,
    amount: number,
    pdfContent: string,
    virementId: number,
  ) {
    const API_KEY = this.configService.get('isProd')
      ? this.configService.get('mailhub.api_key_prod')
      : this.configService.get('mailhub.api_key_dev');

    try {
      const requestBody = {
        layout_identifier: 'tp-531d0f0745894797', // Vous devrez créer un nouveau template pour les virements SEPA
        variables: {
          transfer_id: virementId,
        },
        from: 'info@sonarartists.fr',
        to: to,
        subject: `Virement SEPA pour ${accountOwner}`,
        language: null,

        attachments: [
          {
            filename: `facture_virement_${virementId}.pdf`,
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
      }).then((data) => console.log(data));
    } catch (error) {
      Logger.error('Error:', error);
      throw error;
    }
  }
}
