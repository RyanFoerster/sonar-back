import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import s3Config from '../../config/s3.config';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(S3Service.name);
  private readonly cdnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client(s3Config(configService));
    this.bucket = configService.get('aws.bucket_name');
    this.cdnUrl = configService.get('aws.cdnUrl');

    if (!this.cdnUrl) {
      this.logger.warn("AWS_CDN_URL n'est pas configuré");
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    // Nettoyer le nom du fichier en supprimant les caractères spéciaux et en remplaçant les espaces
    const cleanFileName = this.cleanFileName(file.originalname);
    const key = `${folder}/${cleanFileName}`;

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

  async uploadFileFromBuffer(
    buffer: Buffer,
    folder: string,
    invoice_id: number,
  ): Promise<string> {
    const key = `${folder}/invoice/${invoice_id}.pdf`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
        }),
      );

      return key;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'upload du fichier vers S3: ${error.message}`,
      );
    }
  }

  // Fonction pour nettoyer les noms de fichiers
  private cleanFileName(fileName: string): string {
    // Extraire l'extension du fichier
    const parts = fileName.split('.');
    const extension = parts.length > 1 ? parts.pop() : '';

    // Nettoyer le nom du fichier (sans extension)
    const nameWithoutExtension = parts.join('.');

    // Remplacer les caractères spéciaux et les espaces par des underscores
    const cleanName = nameWithoutExtension
      .normalize('NFD') // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Remplacer les caractères spéciaux par des underscores
      .replace(/_+/g, '_') // Éviter les underscores multiples consécutifs
      .replace(/^_|_$/g, ''); // Supprimer les underscores au début et à la fin

    // Reconstruire le nom du fichier avec l'extension
    return extension ? `${cleanName}.${extension}` : cleanName;
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      this.logger.debug(
        `Tentative de récupération du fichier avec la clé: ${key}`,
      );

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

  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
