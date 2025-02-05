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
        const address = await fetch(
          `${this.baseUrl}enterprise/${vat}/address`,
          {
            headers: {
              Authorization: `Bearer ${BCE_KEY}`,
            },
          },
        ).then((response) => response.json());
        const street = address.Address.street.fr;
        const addressNumber = address.Address.addressNumber;
        const postalCode = address.Address.zipcode;
        const city = address.Address.city.fr;
        const denomination = await fetch(
          `${this.baseUrl}enterprise/${vat}/denominations`,
          {
            headers: {
              Authorization: `Bearer ${BCE_KEY}`,
            },
          },
        ).then((response) => response.json());
        const entrepriseName = denomination[0].Denomination.value;
        return {
          street,
          addressNumber,
          postalCode,
          city,
          entrepriseName,
        };
      }
    } else {
      console.log('error', response.headers);
      return false;
    }
  }
}
