// src/quote/models/quote.model.ts
import { ComptePrincipal } from '@/compte_principal/entities/compte_principal.entity';
import { CompteGroupe } from '@/compte_groupe/entities/compte_groupe.entity';
import { Product } from '@/product/entities/product.entity';
import { Client } from '@/clients/entities/client.entity';
import { Invoice } from '@/invoice/entities/invoice.entity';

export class QuoteDTO {
  id?: number;
  quote_date: Date;
  quote_number?: number;
  service_date: Date;
  price_htva: number;
  total_vat_6: number;
  total_vat_21: number;
  total: number;
  payment_deadline: number;
  validation_deadline: Date;
  status?: string;
  group_acceptance?: 'accepted' | 'refused' | 'pending';
  order_giver_acceptance?: 'accepted' | 'refused' | 'pending';
  comment?: string;
  isVatIncluded: boolean;
  client_info_required?: boolean;
  attachment_url?: string[];
  created_by?: string;
  created_by_mail?: string;
  created_by_phone?: string;
  created_by_project_name?: string;
  main_account?: ComptePrincipal;
  group_account?: CompteGroupe;
  products?: Product[];
  client?: Client;
  invoice?: Invoice;

  constructor(partial: Partial<QuoteDTO>) {
    Object.assign(this, partial);
  }
}
