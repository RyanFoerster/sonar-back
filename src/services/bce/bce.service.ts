import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BceService {
  private readonly baseUrl = 'https://api.kbodata.app/v2/';

  constructor(private configService: ConfigService) {}

  async checkBCE(vat: number) {
    const BCE_KEY = this.configService.get('bce.API_KEY');
    const response = await fetch(`${this.baseUrl}enterprise/${vat}`, {
      headers: {
        Authorization: `Bearer ${BCE_KEY}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.Enterprise.active) {
        return await fetch(`${this.baseUrl}vat/${vat}`, {
          headers: {
            Authorization: `Bearer ${BCE_KEY}`,
          },
        }).then((response) => response.json());
      }
    } else {
      console.log('error', response.headers);
      return false;
    }
  }
}
