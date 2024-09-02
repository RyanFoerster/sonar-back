import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'vernice23@ethereal.email',
      pass: '6yW3nPBuv5jvYPrGwt',
    },
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

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

    const API_KEY = this.configService.get('stage') === 'prod' ? this.configService.get('mailhub.api_key_prod') : this.configService.get('mailhub.api_key_dev')

    try {
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
}
