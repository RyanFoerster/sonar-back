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
import { MailService } from "../services/mail.services";
import { UsersService } from "../users/users.service";

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly usersService: UsersService,
    private clientService: ClientsService,
    private productService: ProductService,
    private comptePrincipalService: ComptePrincipalService,
    private compteGroupeService: CompteGroupeService,
    private readonly mailService: MailService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto, user_id: number) {

    let quote: Quote = this.quoteRepository.create(createQuoteDto);

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

    if(!createQuoteDto.validation_deadline) {
      const currentDate = new Date();
      quote.validation_deadline = new Date(currentDate.getMonth() + 1);
    } else {
      quote.validation_deadline = createQuoteDto.validation_deadline;
    }

    const userConnected = await this.usersService.findOne(user_id);

    quote = await this.quoteRepository.save(quote);

    await this.mailService.sendDevisAcceptationEmail(quote.client.email, quote.client.name, quote.id, "CLIENT");
    await this.mailService.sendDevisAcceptationEmail(userConnected.email, userConnected.firstName, quote.id, "GROUP", userConnected.name);

    return quote;
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
    quote.group_acceptance = "accepted";
    if (quote.order_giver_acceptance === "accepted") {
      quote.status = 'accepted';
    }
    return await this.quoteRepository.save(quote);
  }

  async updateOrderGiverAcceptance(id: number) {
    const quote = await this.findOne(id);
    quote.order_giver_acceptance = "accepted";
    if (quote.group_acceptance === "accepted") {
      quote.status = 'accepted';
    }
    return await this.quoteRepository.save(quote);
  }

  async updateQuoteGroupRejection(id: number) {
    const quote = await this.findOne(id);
    quote.group_acceptance = "refused";
    if (quote.order_giver_acceptance === "refused") {
      quote.status = 'refused';
    }
    return await this.quoteRepository.save(quote);
  }

  async updateOrderGiverRejection(id: number) {
    const quote = await this.findOne(id);
    quote.order_giver_acceptance = "refused";
    if (quote.group_acceptance === "refused") {
      quote.status = 'refused';
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
