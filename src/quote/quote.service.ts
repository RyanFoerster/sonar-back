import { Injectable, Logger } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { Quote } from './entities/quote.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientsService } from '../clients/clients.service';
import { ProductService } from '../product/product.service';
import { Product } from '../product/entities/product.entity';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private clientService: ClientsService,
    private productService: ProductService,
    private comptePrincipalService: ComptePrincipalService,
    private compteGroupeService: CompteGroupeService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto) {
    Logger.debug(createQuoteDto);

    let quote: Quote = this.quoteRepository.create(createQuoteDto);

    Logger.debug(JSON.stringify(quote, null, 2));

    quote.client = await this.clientService.findOne(createQuoteDto.client_id);

    let products: Product[] = [];
    for (const productId of createQuoteDto.products_id) {
      let product = await this.productService.findOne(productId);
      products.push(product);
    }

    quote.products = products;
    quote.price_htva = await this.setTotalHtva(quote.products);
    quote.total_vat_6 = await this.setTotalTva6(quote.products);
    quote.total_vat_21 = await this.setTotalTva21(quote.products);

    quote.total = quote.price_htva + quote.total_vat_21 + quote.total_vat_6;

    Logger.debug(JSON.stringify(quote, null, 2));

    Logger.debug(createQuoteDto.main_account_id);
    Logger.debug(createQuoteDto.group_account_id);
    if (createQuoteDto.main_account_id !== undefined) {
      quote.main_account = await this.comptePrincipalService.findOne(
        createQuoteDto.main_account_id,
      );
    }

    if (createQuoteDto.group_account_id !== undefined) {
      quote.group_account = await this.compteGroupeService.findOne(
        createQuoteDto.group_account_id,
      );
    }

    return this.quoteRepository.save(quote);
  }

  findAll() {
    return `This action returns all quote`;
  }

  findOne(id: number) {
    Logger.debug('Id', id);
    return this.quoteRepository.findOneBy({ id });
  }

  findOneWithoutRelation(id: number) {
    return this.quoteRepository.findOne({
      where: {
        id,
      },
      relations: {
        products: false,
        client: false,
      },
    });
  }

  async update(updateQuoteDto: UpdateQuoteDto) {
    return this.quoteRepository.save(updateQuoteDto);
  }

  async updateQuoteGroupAcceptance(id: number) {
    const quote = await this.findOne(id);
    quote.group_acceptance = true;
    if (quote.order_giver_acceptance === true) {
      quote.status = 'accepted';
    }
    return await this.quoteRepository.save(quote);
  }

  async updateOrderGiverAcceptance(id: number) {
    const quote = await this.findOne(id);
    quote.order_giver_acceptance = true;
    if (quote.group_acceptance === true) {
      quote.status = 'accepted';
    }
    return await this.quoteRepository.save(quote);
  }

  remove(id: number) {
    return `This action removes a #${id} quote`;
  }

  async setTotalHtva(products: Product[]) {
    let total = 0;
    for (const product of products) {
      total += product.price_htva;
    }

    return total;
  }

  async setTotalTva6(products: Product[]) {
    let total = 0;

    for (const product of products) {
      if (product.vat === 0.06) {
        total += product.tva_amount;
      }
    }

    return total;
  }

  async setTotalTva21(products: Product[]) {
    let total = 0;

    for (const product of products) {
      if (product.vat === 0.21) {
        total += product.tva_amount;
      }
    }

    return total;
  }

  async findQuoteWithoutInvoice() {
    return this.quoteRepository.find({
      where: {
        status: 'accepted',
      },
      relations: {
        client: true,
        group_account: true,
        main_account: true,
      },
    });
  }
}
