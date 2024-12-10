import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import s3Config from '../../config/s3.config';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client(s3Config(configService));
    this.bucket = configService.get('aws.bucket_name');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const key = `${folder}/${file.originalname}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return key;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'upload du fichier vers S3: ${error.message}`,
      );
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error('Réponse vide de S3');
      }

      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération du fichier depuis S3: ${error.message}`,
      );
      throw error;
    }
  }

  getFileUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.configService.get('aws.region')}.amazonaws.com/${key}`;
  }
}
