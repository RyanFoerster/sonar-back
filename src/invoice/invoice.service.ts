import { Injectable, Logger } from "@nestjs/common";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Invoice } from "./entities/invoice.entity";
import { Repository } from "typeorm";
import { User } from "../users/entities/user.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { QuoteService } from "../quote/quote.service";
import { Quote } from "../quote/entities/quote.entity";
import { ClientsService } from "../clients/clients.service";
import { ComptePrincipalService } from "../compte_principal/compte_principal.service";
import { CompteGroupeService } from "../compte_groupe/compte_groupe.service";

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly _invoiceRepository: Repository<Invoice>,
    private quoteService: QuoteService,
    private clientService: ClientsService,
    private comptePrincipalService: ComptePrincipalService,
    private compteGroupeService: CompteGroupeService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: User) {

      return await this._invoiceRepository.save(createInvoiceDto);

  }
  findAll() {
    return this._invoiceRepository.find({});
  }

  async findOne(id: number) {
    return await this._invoiceRepository.findOneBy({ id });
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    return await this._invoiceRepository.update(id, updateInvoiceDto);
  }

  async remove(id: number) {
    return await this._invoiceRepository.delete(id);
  }

  private readonly logger = new Logger();

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createFacture() {
    const currentDate = new Date();

    const quoteWithoutInvoice = await this.quoteService.findQuoteWithoutInvoice()

    const currentQuotes: Quote[] = []

    for (const quote of quoteWithoutInvoice) {
      if(quote.group_acceptance === true && quote.order_giver_acceptance === true) {
        currentQuotes.push(quote);
      }
    }

    if(currentQuotes.length > 0) {
      for (const quote of currentQuotes) {

        const invoice = new Invoice()
        invoice.invoice_date = currentDate
        invoice.service_date = quote.service_date
        currentDate.setDate(currentDate.getDate() + quote.payment_deadline)
        invoice.payment_deadline = currentDate
        invoice.price_htva = quote.price_htva
        invoice.total = quote.total
        invoice.total_vat_21 = quote.total_vat_21
        invoice.total_vat_6 = quote.total_vat_6

        const invoiceCreated = await this._invoiceRepository.save(invoice);
        this.logger.debug(JSON.stringify(invoiceCreated));
        invoiceCreated.quote = await this.quoteService.findOne(quote.id);
        invoiceCreated.client = await this.clientService.findOne(quote.client.id)
        if(quote.main_account) {
          invoiceCreated.main_account = await this.comptePrincipalService.findOne(quote.main_account.id)
        }

        if(quote.group_account) {
          invoiceCreated.group_account = await this.compteGroupeService.findOne(quote.group_account.id)
        }
        await this._invoiceRepository.update(invoiceCreated.id, invoiceCreated);
        quote.status = "invoiced"
        await this.quoteService.update(quote.id, quote)
      }

      this.logger.debug("Des factures ont été créees");
    } else {
      this.logger.error("Aucune facture crée")
    }

  }
}
