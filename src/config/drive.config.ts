import { GoogleDriveConfig } from 'nestjs-googledrive-upload';
import { ConfigService } from '@nestjs/config';


export default (configService: ConfigService): GoogleDriveConfig => ({
  type: configService?.get('drive.type'),
  project_id: configService?.get('drive.project_id'),
  private_key_id: configService?.get('drive.private_key_id'),
  private_key: configService?.get('drive.private_key'),
  client_email: configService?.get('drive.client_email'),
  client_id: configService?.get('drive.client_id'),
  auth_uri: configService?.get('drive.auth_uri'),
  token_uri: configService?.get('drive.token_uri'),
  auth_provider_x509_cert_url: configService?.get('drive.auth_provider_x509_cert_url'),
  client_x509_cert_url: configService?.get('drive.client_x509_cert_url'),
  universe_domain: configService?.get('drive.universe_domain'),
});
