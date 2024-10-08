import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateCreditNoteDto,
  CreateInvoiceDto,
} from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuoteService } from '../quote/quote.service';
import { Quote } from '../quote/entities/quote.entity';
import { ClientsService } from '../clients/clients.service';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MailService } from 'src/services/mail.services';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly _invoiceRepository: Repository<Invoice>,
    private quoteService: QuoteService,
    private clientService: ClientsService,
    private comptePrincipalService: ComptePrincipalService,
    private compteGroupeService: CompteGroupeService,
    private dataSource: DataSource,
    private mailService: MailService,
    private usersService: UsersService,
  ) {}

  async create(quoteObject: any, user: User, params: any) {
    let quote = quoteObject.quote;
    let quoteFromDB = await this.quoteService.findOne(quote.id);
    let account;
    let userFromDB = await this.usersService.findOne(user.id);

    if (!userFromDB) {
      throw new BadRequestException('Aucun utilisateur trouvé');
    }

    if (!quoteFromDB) {
      throw new BadRequestException('Aucun devis trouvé');
    }

    if (quoteFromDB.invoice !== null) {
      throw new BadRequestException('Une facture existe déja');
    }

    let invoice = await this.createInvoiceFromQuote(quoteFromDB);

    const invoiceCreated = await this._invoiceRepository.save(invoice);

    invoiceCreated.quote = quoteFromDB;

    invoiceCreated.client = await this.clientService.findOne(
      quoteFromDB.client.id,
    );

    if (params.type === 'PRINCIPAL') {
      account = await this.comptePrincipalService.findOne(params.account_id);
      invoiceCreated.main_account = account;
    }

    if (params.type === 'GROUP') {
      account = await this.compteGroupeService.findOne(params.account_id);
      invoiceCreated.group_account = account;
    }

    invoiceCreated.quote = quoteFromDB;
    if (invoiceCreated.type !== 'credit_note') {
      invoiceCreated.products = quoteFromDB.products;
    }
    await this._invoiceRepository.save(invoiceCreated);
    quoteFromDB.status = 'invoiced';
    quoteFromDB.invoice = invoiceCreated;
    await this.quoteService.save(quoteFromDB);
    const pdf = this.generateInvoicePDF(quoteFromDB, userFromDB);
    this.mailService.sendInvoiceEmail(quoteFromDB, userFromDB, pdf);
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
    invoice.validation_deadline = quote.validation_deadline;

    invoice.price_htva = quote.price_htva;
    invoice.total = quote.total;
    invoice.total_vat_21 = quote.total_vat_21;
    invoice.total_vat_6 = quote.total_vat_6;
    invoice.status = 'payment_pending';

    return invoice;
  }

  generateInvoicePDF(quote: Quote, user: User) {
    const doc = new jsPDF();
    const invoice = quote.invoice;

    // Ajouter le logo
    // const logoUrl = '/assets/images/Groupe-30.png';
    // doc.addImage(logoUrl, 'PNG', 10, 10, 50, 20);

    // Informations sur l'utilisateur (alignées à gauche)
    doc.setFontSize(12);
    doc.text(`Créé par: ${user.firstName} ${user.name}`, 10, 40);
    doc.text(`Email: ${user.email}`, 10, 50);
    doc.text(`Téléphone: ${user.telephone}`, 10, 60);

    // Informations sur le client (alignées à droite)
    const clientInfo = [
      `Client: ${quote.client.name}`,
      `Email: ${quote.client.email}`,
      `Téléphone: ${quote.client.phone}`,
      `Adresse: ${quote.client.street} ${quote.client.number}, ${quote.client.city}, ${quote.client.country}, ${quote.client.postalCode}`,
    ];

    const pageWidth = doc.internal.pageSize.getWidth();
    clientInfo.forEach((line, index) => {
      const textWidth = doc.getTextWidth(line);
      doc.text(line, pageWidth - textWidth - 10, 40 + index * 10);
    });

    // Tableau pour les informations sur le devis
    const invoiceData = [
      ['Date de la facture', invoice.invoice_date.toLocaleString()],
      ['Date de service', invoice.service_date.toLocaleString()],
      ['Total HTVA', `${invoice.price_htva.toFixed(2)} €`],
      ['Total TVA 6%', `${invoice.total_vat_6.toFixed(2)} €`],
      ['Total TVA 21%', `${invoice.total_vat_21.toFixed(2)} €`],
      ['Total TTC', `${invoice.total.toFixed(2)} €`],
    ];

    let yPosition = 100;
    autoTable(doc, {
      head: [['Information', 'Valeur']],
      body: invoiceData,
      startY: yPosition,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 100, 100] },
    });

    // Mettre à jour la position Y après le premier tableau
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Tableau pour les détails des produits
    const productData = quote.products.map((product) => [
      product.description,
      `Quantité: ${product.quantity}`,
      `Prix: ${product.price.toFixed(2)} €`,
    ]);

    autoTable(doc, {
      head: [['Produit', 'Quantité', 'Prix']],
      body: productData,
      startY: yPosition,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 100, 100] },
    });

    return doc.output('arraybuffer');
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

    const quoteWithoutInvoice =
      await this.quoteService.findQuoteWithoutInvoice();
    Logger.debug(JSON.stringify(quoteWithoutInvoice, null, 2));

    const currentQuotes: Quote[] = [];

    for (const quote of quoteWithoutInvoice) {
      const serviceDate = new Date(quote.service_date);
      const dateUnJourPlus = new Date(
        serviceDate.getTime() + 24 * 60 * 60 * 1000,
      );
      const sameDate =
        currentDate.getFullYear() === dateUnJourPlus.getFullYear() &&
        currentDate.getMonth() === dateUnJourPlus.getMonth() &&
        currentDate.getDate() === dateUnJourPlus.getDate();
      if (
        sameDate &&
        quote.group_acceptance === 'accepted' &&
        quote.order_giver_acceptance === 'accepted'
      ) {
        currentQuotes.push(quote);
      }
    }

    Logger.debug('Current quotes', JSON.stringify(currentQuotes, null, 2));

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
        invoice.validation_deadline = quote.validation_deadline;
        invoice.status = 'pending';

        const invoiceCreated = await this._invoiceRepository.save(invoice);
        this.logger.debug(JSON.stringify(invoiceCreated));
        invoiceCreated.quote = await this.quoteService.findOne(quote.id);
        invoiceCreated.client = await this.clientService.findOne(
          quote.client.id,
        );
        if (quote.main_account) {
          invoiceCreated.main_account =
            await this.comptePrincipalService.findOne(quote.main_account.id);
        }

        if (quote.group_account) {
          invoiceCreated.group_account = await this.compteGroupeService.findOne(
            quote.group_account.id,
          );
        }
        await this._invoiceRepository.update(invoiceCreated.id, invoiceCreated);
        quote.status = 'invoiced';
        quote.invoice = invoiceCreated;
        await this.quoteService.save(quote);
      }

      this.logger.debug('Des factures ont été créees');
    } else {
      this.logger.error('Aucune facture crée');
    }
  }

  async createCreditNote(
    createCreditNoteDto: CreateCreditNoteDto,
  ): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOneBy(Invoice, {
        id: createCreditNoteDto.linkedInvoiceId,
      });

      if (!invoice) {
        throw new Error('Invoice not found'); // Vérifie si la facture existe
      }

      if (createCreditNoteDto.creditNoteAmount > invoice.total) {
        throw new Error('Credit note amount exceeds invoice total amount'); // Vérifie que le montant de la note de crédit ne dépasse pas le total de la facture
      }
      Logger.debug(JSON.stringify(invoice, null, 2));
      // Crée la note de crédit en utilisant les données fournies
      let { id, ...invoiceWithoutId } = invoice;
      const creditNote = manager.create(Invoice, {
        ...invoiceWithoutId,
        ...createCreditNoteDto,
        type: 'credit_note',
      });
      return manager.save(creditNote);
    });
    // Récupère la facture liée
    // Sauvegarde la note de crédit dans la base de données
  }

  findCreditNoteByInvoiceId(invoice_id: number) {
    Logger.debug(invoice_id);
    return this._invoiceRepository.findOneBy({
      linkedInvoiceId: invoice_id,
      type: 'credit_note',
    });
  }
}
