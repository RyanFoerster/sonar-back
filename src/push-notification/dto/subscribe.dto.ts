import { IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubscriptionKeys {
  @IsNotEmpty()
  p256dh: string;

  @IsNotEmpty()
  auth: string;
}

class SubscriptionDetails {
  @IsNotEmpty()
  endpoint: string;

  expirationTime: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionKeys)
  keys: SubscriptionKeys;
}

export class SubscribeDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionDetails)
  subscription: SubscriptionDetails;
}
