import { ConfigService } from '@nestjs/config';

export default (configService: ConfigService) => ({
  region: configService.get('aws.region'),
  credentials: {
    accessKeyId: configService.get('aws.access_key_id'),
    secretAccessKey: configService.get('aws.secret_access_key'),
  },
  bucket: configService.get('aws.bucket_name'),
});
