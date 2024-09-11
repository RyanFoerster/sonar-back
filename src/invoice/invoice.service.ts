import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { CreateCreditNoteDto, CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Invoice } from "./entities/invoice.entity";
import { DataSource, Repository } from 'typeorm';
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
    private dataSource: DataSource
  ) {
  }

  async create(quoteObject: any, user: User, params: any) {

    let quote = quoteObject.quote
    this.logger.debug("type of account", JSON.stringify(quote, null, 2));
    let quoteFromDB = await this.quoteService.findOne(quote.id);
    this.logger.warn("quoteFromDB", JSON.stringify(quoteFromDB.id));
    let account


    if (!quoteFromDB) {
      this.logger.error("Quote not found", quote);
      throw new BadRequestException("Aucun devis trouvé");
    }

    if (quoteFromDB.invoice !== null) {
      this.logger.error("Invoice already exists", quoteFromDB.invoice);
      throw new BadRequestException("Une facture existe déja");
    }

    this.logger.debug("Juste avant de créer la facture");
    let invoice = await this.createInvoiceFromQuote(quoteFromDB);
    this.logger.debug(JSON.stringify(invoice));

    const invoiceCreated = await this._invoiceRepository.save(invoice);
    this.logger.debug(JSON.stringify(invoiceCreated));

    invoiceCreated.quote = quoteFromDB;
    this.logger.debug("Devis attribuer a la facture", quote);

    this.logger.debug("Avant de récupérer le client", user);
    invoiceCreated.client = await this.clientService.findOne(quoteFromDB.client.id);

    this.logger.debug("Avant de récupérer le main account", quoteFromDB.main_account);
    if(params.type ===  "PRINCIPAL") {
      account = await this.comptePrincipalService.findOne(params.account_id);
      invoiceCreated.main_account = account
    }

    this.logger.debug("Avant de récupérer le group account", quoteFromDB.group_account);
    if(params.type === "GROUP"){
      account = await this.compteGroupeService.findOne(params.account_id);
      invoiceCreated.main_account = account
    }

    this.logger.debug("Avant de update la facture", invoiceCreated.main_account);
    invoiceCreated.quote = quoteFromDB;
    if(invoiceCreated.type !== "credit_note") {
      invoiceCreated.products = quoteFromDB.products
    }
    await this._invoiceRepository.save(invoiceCreated);
    quoteFromDB.status = "invoiced";
    quoteFromDB.invoice = invoiceCreated
    this.logger.debug("Avant de update le devis");
    await this.quoteService.update( quoteFromDB);

    return await this._invoiceRepository.findOneBy({ id: invoiceCreated.id });
  }

  async createInvoiceFromQuote(quote: Quote) {

    const currentDate = new Date();

    const invoice = new Invoice();
    invoice.invoice_date = currentDate;
    invoice.service_date = quote.service_date;

// Calculer la date limite de paiement
    const paymentDeadline = new Date(currentDate);
    paymentDeadline.setDate(currentDate.getDate() + quote.payment_deadline);
    invoice.payment_deadline = paymentDeadline;

    invoice.price_htva = quote.price_htva;
    invoice.total = quote.total;
    invoice.total_vat_21 = quote.total_vat_21;
    invoice.total_vat_6 = quote.total_vat_6;
    invoice.status = "payment_pending";

    return invoice;
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  async createFacture() {
    const currentDate = new Date();

    const quoteWithoutInvoice = await this.quoteService.findQuoteWithoutInvoice();

    const currentQuotes: Quote[] = [];

    for (const quote of quoteWithoutInvoice) {
      const serviceDate = new Date(quote.service_date);
      const dateUnJourPlus = new Date(serviceDate.getTime() + (24 * 60 * 60 * 1000));
      const sameDate = currentDate.getFullYear() === dateUnJourPlus.getFullYear() &&
        currentDate.getMonth() === dateUnJourPlus.getMonth() &&
        currentDate.getDate() === dateUnJourPlus.getDate();
      if (sameDate && quote.group_acceptance === true && quote.order_giver_acceptance === true) {
        currentQuotes.push(quote);
      }
    }

    if (currentQuotes.length > 0) {
      for (const quote of currentQuotes) {

        const invoice = new Invoice();
        invoice.invoice_date = currentDate;
        invoice.service_date = quote.service_date;
        currentDate.setDate(currentDate.getDate() + quote.payment_deadline);
        invoice.payment_deadline = currentDate;
        invoice.price_htva = quote.price_htva;
        invoice.total = quote.total;
        invoice.total_vat_21 = quote.total_vat_21;
        invoice.total_vat_6 = quote.total_vat_6;

        const invoiceCreated = await this._invoiceRepository.save(invoice);
        this.logger.debug(JSON.stringify(invoiceCreated));
        invoiceCreated.quote = await this.quoteService.findOne(quote.id);
        invoiceCreated.client = await this.clientService.findOne(quote.client.id);
        if (quote.main_account) {
          invoiceCreated.main_account = await this.comptePrincipalService.findOne(quote.main_account.id);
        }

        if (quote.group_account) {
          invoiceCreated.group_account = await this.compteGroupeService.findOne(quote.group_account.id);
        }
        await this._invoiceRepository.update(invoiceCreated.id, invoiceCreated);
        quote.status = "invoiced";
        await this.quoteService.update(quote);
      }

      this.logger.debug("Des factures ont été créees");
    } else {
      this.logger.error("Aucune facture crée");
    }

  }

  async createCreditNote(
    createCreditNoteDto: CreateCreditNoteDto
  ): Promise<Invoice> {
    return await this.dataSource.transaction(async manager => {
      const invoice = await manager.findOneBy(Invoice, { id: createCreditNoteDto.linkedInvoiceId });

      if (!invoice) {
        throw new Error("Invoice not found"); // Vérifie si la facture existe
      }

      if (createCreditNoteDto.creditNoteAmount > invoice.total) {
        throw new Error("Credit note amount exceeds invoice total amount"); // Vérifie que le montant de la note de crédit ne dépasse pas le total de la facture
      }
      Logger.debug(JSON.stringify(invoice, null, 2));
      // Crée la note de crédit en utilisant les données fournies
      let {id, ...invoiceWithoutId} = invoice
      const creditNote = manager.create(Invoice, {
        ...invoiceWithoutId,
        ...createCreditNoteDto,
        type: "credit_note"
      });
      return manager.save(creditNote);
    })
    // Récupère la facture liée
    // Sauvegarde la note de crédit dans la base de données
  }

  findCreditNoteByInvoiceId(invoice_id: number) {
    Logger.debug(invoice_id)
    return this._invoiceRepository.findOneBy({
      linkedInvoiceId: invoice_id,
      type: "credit_note"
    })
  }
}