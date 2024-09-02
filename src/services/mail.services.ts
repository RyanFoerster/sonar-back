import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from 'nodemailer';
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";

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

  constructor(private readonly configService: ConfigService,
              private readonly httpService: HttpService) {
  }

  async sendPasswordResetEmail(to: string, token: string, firstName: string, name: string) {
    /*const resetLink = `http://yourapp.com/reset-password?token=${token}`;
    const mailOptions = {
      from: 'Auth-backend service',
      to,
      subject: 'Password reset request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`
    }

    await this.transporter.sendMail(mailOptions);*/
    Logger.debug("Je passe ici")
    Logger.debug(this.configService.get('mailhub.api_key'))
    try {
      this.httpService.post(`https://api.mailhub.sh/v1/send`, {
        layout_identifier: 'tp-dc76ec2fba7f4b04',
        variables: {
          firstName,
          name,
          resetToken: token,
        },
        from: '@sonarartistsapp@gmail.com',
        to,
        subject: 'Réinitialisation du mot de passe',
        language: null,
      }).subscribe(data => console.log(data))

    } catch (error) {
      console.error('Error:', error);
    }
    
  }
}
