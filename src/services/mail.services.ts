import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../users/entities/user.entity';
import axios from 'axios';

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
    name?: string,
    attachment?: Buffer,
  ) {
    const API_KEY =
      this.configService.get('isProd') === true
        ? this.configService.get('mailhub.api_key_prod')
        : this.configService.get('mailhub.api_key_dev');
    const config = this.configService.get('isProd') ? 'PROD' : 'DEV';

    Logger.debug('stage', this.configService.get('stage'));

    try {
      // Convertir le buffer en base64
      const base64Attachment = attachment
        ? attachment.toString('base64')
        : null;

      const payload = {
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
      };

      // Ajouter la pièce jointe seulement si elle existe
      if (base64Attachment) {
        payload['attachments'] = [
          {
            filename: `devis-${quote_id}.pdf`,
            content: base64Attachment,
            encoding: 'base64',
            contentType: 'application/pdf',
          },
        ];
      }

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
        },
      );

      Logger.debug(`Email envoyé avec succès pour le devis ${quote_id}`);
      return response.data;
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email pour le devis ${quote_id}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async sendInvoiceEmail(quote: Quote, user: User, pdfContent: any) {
    const API_KEY =
      this.configService.get('isProd') === true
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
    pdfContent: string,
    virementId: number,
    cc: string | null = null,
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
