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
        payload['attachments'] = attachments.map((attachment, index) => ({
          filename: attachmentNames[index],
          content: attachment.toString('base64'),
          encoding: 'base64',
          contentType: 'application/pdf',
        }));
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
        JSON.stringify(error.response?.data),
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
      // Convertir l'arraybuffer en base64
      const base64Content = Buffer.from(pdfContent).toString('base64');

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
      // Convertir l'arraybuffer en base64
      const base64Content = Buffer.from(pdfContent).toString('base64');

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
