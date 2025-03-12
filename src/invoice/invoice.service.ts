import { Product } from '@/product/entities/product.entity';
import { ProductService } from '@/product/product.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataSource, Repository } from 'typeorm';
import { ClientsService } from '../clients/clients.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { Quote } from '../quote/entities/quote.entity';
import { QuoteService } from '../quote/quote.service';
import { MailService } from '../mail/mail.services';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateCreditNoteDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { CompteGroupe } from '@/compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipal } from '@/compte_principal/entities/compte_principal.entity';
import { AssetsService } from '../services/assets.service';
import { S3Service } from '@/services/s3/s3.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly COMPANY_INFO = {
    name: 'Sonar Artists ASBL',
    address: '6 rue Francisco Ferrer',
    city: '4460 Grâce-Hollogne, Belgique',
    email: 'info@sonarartists.be',
    vat: 'TVA BE0700273583',
    iban: 'BE0700273583', // À remplacer par l'IBAN réel
    bic: 'GEBABEBB', // À remplacer par le BIC réel
  };

  private readonly PAGE_MARGIN = 20;
  private readonly MAX_WIDTH = 60;

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
    private productService: ProductService,
    private assetsService: AssetsService,
    private s3Service: S3Service,
  ) {}

  async create(
    quoteObject: any,
    user: User,
    params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ) {
    let quoteFromDB = await this.quoteService.findOne(quoteObject.id);
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

    if (params.type === 'PRINCIPAL') {
      account = await this.comptePrincipalService.findOne(params.account_id);
      invoice.main_account = account;
      invoice.invoice_number = account.next_invoice_number;

      // Incrémenter et mettre à jour le prochain numéro de facture
      account.next_invoice_number += 1;
      await this.comptePrincipalService.save(account);
    }

    if (params.type === 'GROUP') {
      account = await this.compteGroupeService.findOne(params.account_id);
      invoice.group_account = account;
      invoice.invoice_number = account.next_invoice_number;

      // Incrémenter et mettre à jour le prochain numéro de facture
      account.next_invoice_number += 1;
      await this.compteGroupeService.save(account);
    }

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
    const pdf = await this.generateInvoicePDF(quoteFromDB);
    // const pdfBuffer = Buffer.from(pdf);
    const pdfBuffer = Buffer.from(pdf);

    const pdfKey = await this.s3Service.uploadFileFromBuffer(
      pdfBuffer,
      'invoices',
      invoiceCreated.id,
    );
    this.mailService.sendInvoiceEmail(quoteFromDB, pdfKey);

    return await this._invoiceRepository.findOneBy({ id: invoiceCreated.id });
  }

  async save(invoice: Invoice) {
    return await this._invoiceRepository.save(invoice);
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

  private formatDateBelgium(date: Date): string {
    return new Date(date).toLocaleDateString('fr-BE');
  }

  private addHeader(doc: jsPDF, pageWidth: number): void {
    try {
      const logoData = this.assetsService.getAssetBuffer(
        'assets/images/Groupe-30.png',
      );
      // Note: Le chargement du logo est temporairement désactivé en raison de problèmes de compatibilité de types
      // TODO: Résoudre le problème de type avec le Buffer pour le logo
      // doc.addImage(logoData, 'PNG', 10, 10, 50, 20);
    } catch (error) {
      this.logger.warn(`Impossible de charger le logo: ${error.message}`);
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      this.COMPANY_INFO.name,
      pageWidth - this.PAGE_MARGIN,
      this.PAGE_MARGIN,
      { align: 'right' },
    );
    doc.text(
      this.COMPANY_INFO.address,
      pageWidth - this.PAGE_MARGIN,
      this.PAGE_MARGIN + 5,
      { align: 'right' },
    );
    doc.text(
      this.COMPANY_INFO.city,
      pageWidth - this.PAGE_MARGIN,
      this.PAGE_MARGIN + 10,
      { align: 'right' },
    );
    doc.text(
      `Email: ${this.COMPANY_INFO.email}`,
      pageWidth - this.PAGE_MARGIN,
      this.PAGE_MARGIN + 20,
      { align: 'right' },
    );

    doc.setDrawColor(200);
    doc.line(
      this.PAGE_MARGIN,
      this.PAGE_MARGIN + 30,
      pageWidth - this.PAGE_MARGIN,
      this.PAGE_MARGIN + 30,
    );
  }

  private addClientInfo(doc: jsPDF, client: any, pageWidth: number): void {
    let yPosition = 75;

    doc.setFontSize(11);
    doc.text('Adressé à:', pageWidth - this.PAGE_MARGIN - 60, 70);
    doc.setFontSize(10);

    const clientName = doc.splitTextToSize(client.name, this.MAX_WIDTH);
    clientName.forEach((line: string) => {
      doc.text(line, pageWidth - this.PAGE_MARGIN - 60, yPosition);
      yPosition += 5;
    });

    doc.text(
      `${client.street} ${client.number}`,
      pageWidth - this.PAGE_MARGIN - 60,
      yPosition,
    );
    yPosition += 5;
    doc.text(
      `${client.postalCode} ${client.city}`,
      pageWidth - this.PAGE_MARGIN - 60,
      yPosition,
    );
    yPosition += 5;
    if (client.country) {
      doc.text(client.country, pageWidth - this.PAGE_MARGIN - 60, yPosition);
      yPosition += 5;
    }
    if (client.phone) {
      doc.text(
        `Tél: ${client.phone}`,
        pageWidth - this.PAGE_MARGIN - 60,
        yPosition,
      );
      yPosition += 5;
    }
    doc.text(
      `Email: ${client.email}`,
      pageWidth - this.PAGE_MARGIN - 60,
      yPosition,
    );
  }

  private addProductsTable(doc: jsPDF, products: any[], type: string): number {
    const tableStart = 120;
    autoTable(doc, {
      startY: tableStart,
      head: [
        ['Description', 'Quantité', 'Prix unitaire HT', 'TVA', 'Total HT'],
      ],
      body:
        type === 'credit_note'
          ? products.map((product) => [
              product.description,
              product.quantity,
              `${product.price_htva.toFixed(2)} €`,
              `${(product.vat * 100).toFixed(0)}%`,
              `${(product.price_htva * product.quantity).toFixed(2)} €`,
            ])
          : products.map((product) => [
              product.description,
              product.quantity,
              `${product.price_htva.toFixed(2)} €`,
              `${(product.vat * 100).toFixed(0)}%`,
              `${(product.price_htva * product.quantity).toFixed(2)} €`,
            ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [156, 139, 209], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 40, halign: 'right' },
      },
    });

    return (doc as any).lastAutoTable.finalY;
  }

  private addTotals(
    doc: jsPDF,
    invoice: Invoice,
    finalY: number,
    pageWidth: number,
  ): void {
    autoTable(doc, {
      body: [
        ['Sous-total', `${invoice.price_htva.toFixed(2)}€`],
        ['TVA 6%', `${invoice.total_vat_6.toFixed(2)}€`],
        ['TVA 21%', `${invoice.total_vat_21.toFixed(2)}€`],
        ['Total', `${invoice.total.toFixed(2)}€`],
        ['Payé', '0,00€'],
        ['Solde', `${invoice.total.toFixed(2)}€`],
      ],
      startY: finalY + 10,
      margin: { left: pageWidth - 90 },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 40, halign: 'right' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.row.index === 5) {
          doc.setFillColor(0, 0, 0);
          doc.setTextColor(255, 255, 255);
        }
      },
    });
  }

  private addFooter(doc: jsPDF, pageHeight: number): void {
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);

    // Colonne 1 - Siège social
    doc.setFont('helvetica', 'bold');
    doc.text('Siège social', 10, pageHeight - 40);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, 10, pageHeight - 35);
    doc.text(this.COMPANY_INFO.city, 10, pageHeight - 30);

    // Colonne 2 - Coordonnées
    doc.setFont('helvetica', 'bold');
    doc.text('Coordonnées', 80, pageHeight - 40);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.name, 80, pageHeight - 35);
    doc.text(this.COMPANY_INFO.email, 80, pageHeight - 30);

    // Colonne 3 - Détails bancaires
    doc.setFont('helvetica', 'bold');
    doc.text('Détails bancaires', 150, pageHeight - 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`IBAN: ${this.COMPANY_INFO.iban}`, 150, pageHeight - 35);
    doc.text(`BIC: ${this.COMPANY_INFO.bic}`, 150, pageHeight - 30);
  }

  async generateInvoicePDF(quote: Quote): Promise<ArrayBuffer> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const invoice = quote.invoice;

    // Couleur principale pour le design
    const mainColor = [200, 192, 77] as [number, number, number]; // #C8C04D en RGB - même couleur que dans generateQuotePDF

    try {
      const logoData = this.assetsService.getAssetBuffer(
        '../assets/images/Groupe-30.png',
      );
      doc.addImage(
        logoData as any,
        'PNG',
        this.PAGE_MARGIN,
        this.PAGE_MARGIN,
        50,
        20,
      );
    } catch (error) {
      this.logger.warn(`Impossible de charger le logo: ${error.message}`);
    }

    // Titre "Facture" en haut à droite
    doc.setFontSize(28);
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    doc.text('Facture', pageWidth - this.PAGE_MARGIN, 35, { align: 'right' });

    // Date et numéro de facture
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      this.formatDateBelgium(invoice.invoice_date),
      pageWidth - this.PAGE_MARGIN,
      45,
      { align: 'right' },
    );
    doc.text(`N°${invoice.invoice_number}`, pageWidth - this.PAGE_MARGIN, 55, {
      align: 'right',
    });

    // Informations de l'émetteur
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(this.COMPANY_INFO.name, this.PAGE_MARGIN, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, this.PAGE_MARGIN, 75);
    doc.text(this.COMPANY_INFO.city, this.PAGE_MARGIN, 80);
    doc.text(`Email: ${this.COMPANY_INFO.email}`, this.PAGE_MARGIN, 85);
    doc.text(this.COMPANY_INFO.vat, this.PAGE_MARGIN, 90);

    // Informations du client
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.client.name, pageWidth - this.PAGE_MARGIN - 60, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${quote.client.street} ${quote.client.number}`,
      pageWidth - this.PAGE_MARGIN - 60,
      75,
    );
    doc.text(
      `${quote.client.postalCode} ${quote.client.city}`,
      pageWidth - this.PAGE_MARGIN - 60,
      80,
    );
    if (quote.client.company_vat_number) {
      doc.text(
        quote.client.company_vat_number,
        pageWidth - this.PAGE_MARGIN - 60,
        85,
      );
    }

    // Titre du document
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Facture N°${invoice.invoice_number} pour ${quote.client.name}`,
      this.PAGE_MARGIN,
      105,
    );

    // Délai de paiement
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (invoice.payment_deadline) {
      doc.text(
        `Date limite de paiement : ${this.formatDateBelgium(invoice.payment_deadline)}`,
        pageWidth - this.PAGE_MARGIN,
        115,
        { align: 'right' },
      );
    }

    // Tableau des produits
    const startY = 125;
    autoTable(doc, {
      head: [
        ['Description', 'Quantité', 'Prix unitaire HT', 'TVA', 'Total HT'],
      ],
      body: quote.products.map((product) => [
        product.description,
        product.quantity.toString(),
        `${product.price_htva.toFixed(2)}€`,
        `${(product.vat * 100).toFixed(0)}%`,
        `${(product.price_htva * product.quantity).toFixed(2)}€`,
      ]),
      startY: startY,
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: mainColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 40, halign: 'right' },
      },
      // Configuration spécifique pour les en-têtes de colonnes
      willDrawCell: function (data) {
        // Si c'est une cellule d'en-tête
        if (data.row.section === 'head') {
          // Définir l'alignement des en-têtes pour correspondre aux colonnes
          if (data.column.index === 0) {
            data.cell.styles.halign = 'left';
          } else if (data.column.index === 1) {
            data.cell.styles.halign = 'center';
          } else {
            data.cell.styles.halign = 'right';
          }
        }
      },
      margin: { left: this.PAGE_MARGIN, right: this.PAGE_MARGIN },
    });

    // Position Y après le tableau
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Sous-total et TVA
    autoTable(doc, {
      body: [
        ['Sous-total', `${invoice.price_htva.toFixed(2)}€`],
        ['TVA 6%', `${invoice.total_vat_6.toFixed(2)}€`],
        ['TVA 21%', `${invoice.total_vat_21.toFixed(2)}€`],
        ['Total', `${invoice.total.toFixed(2)}€`],
      ],
      startY: finalY,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 40, halign: 'left' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: pageWidth - 100 },
      didDrawCell: (data) => {
        if (data.row.index === 5) {
          doc.setFillColor(0, 0, 0);
          doc.setTextColor(255, 255, 255);
        }
      },
    });

    // Pied de page avec informations de l'entreprise
    const footerY = pageHeight - 30;

    // Calculer les positions horizontales pour éviter les chevauchements
    const col1X = this.PAGE_MARGIN;
    const col2X = pageWidth / 3;
    const col3X = (pageWidth / 3) * 2 - 10;

    // Colonne 1 - Siège social
    doc.setFont('helvetica', 'bold');
    doc.text('Siège social', col1X, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, col1X, footerY + 5);
    doc.text(this.COMPANY_INFO.city.split(',')[0], col1X, footerY + 10);
    doc.text('Belgique', col1X, footerY + 15);
    doc.text(this.COMPANY_INFO.vat.replace('TVA ', ''), col1X, footerY + 20);

    // Colonne 2 - Coordonnées
    doc.setFont('helvetica', 'bold');
    doc.text('Coordonnées', col2X, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.name, col2X, footerY + 5);
    doc.text(this.COMPANY_INFO.email, col2X, footerY + 10);

    // Colonne 3 - Détails bancaires
    doc.setFont('helvetica', 'bold');
    doc.text('Détails bancaires', col3X, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(`IBAN: ${this.COMPANY_INFO.iban}`, col3X, footerY + 5);
    doc.text(`BIC: ${this.COMPANY_INFO.bic}`, col3X, footerY + 10);

    return doc.output('arraybuffer');
  }

  async findAll(user_id: number) {
    const user = await this.usersService.findOne(user_id);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        "Vous n'êtes pas autorisé à accéder à cette ressource",
      );
    }
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

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async createFacture() {
    const currentDate = new Date();

    const quoteWithoutInvoice =
      await this.quoteService.findQuoteWithoutInvoice();

    this.logger.log(
      `Nombre de devis récupérer : ${quoteWithoutInvoice.length}`,
    );

    const currentQuotes: Quote[] = [];

    for (const quote of quoteWithoutInvoice) {
      const serviceDate = new Date(quote.service_date);
      const dateUnJourPlus = new Date(
        serviceDate.getTime() + 24 * 60 * 60 * 1000,
      );
      const isAfterServiceDate =
        currentDate.getTime() >= dateUnJourPlus.getTime();
      if (
        isAfterServiceDate &&
        quote.group_acceptance === 'accepted' &&
        quote.order_giver_acceptance === 'accepted'
      ) {
        currentQuotes.push(quote);
      }
    }

    this.logger.log(`Nombre de devis à facturer : ${currentQuotes.length}`);

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

        if (quote.main_account) {
          invoice.main_account = await this.comptePrincipalService.findOne(
            quote.main_account.id,
          );
          this.logger.log(
            `Compte principal trouvé : ${invoice.main_account.next_invoice_number}`,
          );
          invoice.invoice_number = invoice.main_account.next_invoice_number;
          invoice.main_account.next_invoice_number += 1;
          await this.comptePrincipalService.save(invoice.main_account);
        }

        if (quote.group_account) {
          invoice.group_account = await this.compteGroupeService.findOne(
            quote.group_account.id,
          );
          invoice.invoice_number = invoice.group_account.next_invoice_number;
          invoice.group_account.next_invoice_number += 1;
          await this.compteGroupeService.save(invoice.group_account);
        }

        const invoiceCreated = await this._invoiceRepository.save(invoice);
        invoiceCreated.quote = await this.quoteService.findOne(quote.id);
        invoiceCreated.client = await this.clientService.findOne(
          quote.client.id,
        );

        invoiceCreated.products = [...quote.products];

        await this._invoiceRepository.save(invoiceCreated);
        quote.status = 'invoiced';
        quote.invoice = invoiceCreated;
        await this.quoteService.save(quote);
        const pdf = await this.generateInvoicePDF(quote);
        const pdfBuffer = Buffer.from(pdf);
        const pdfKey = await this.s3Service.uploadFileFromBuffer(
          pdfBuffer,
          'invoices',
          invoiceCreated.id,
        );
        await this.mailService.sendInvoiceEmail(invoiceCreated, pdfKey);
      }
    }
  }

  async createCreditNote(
    createCreditNoteDto: CreateCreditNoteDto,
    params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOneBy(Invoice, {
        id: createCreditNoteDto.linkedInvoiceId,
      });

      if (invoice.linkedInvoiceId) {
        throw new Error('Invoice already has a linked credit note');
      }

      const products = [];
      for (const productId of createCreditNoteDto.products_ids) {
        const product = await this.productService.findOne(productId);
        if (product.quote === null) {
          products.push(product); // Si le produit n'est pas lié à un devis, on l'ajoute à la note de crédit car il n'a pas été facturé
        }
      }

      // Récupérer le compte principal par défaut
      let account: ComptePrincipal | CompteGroupe;
      if (params.type === 'PRINCIPAL') {
        account = await this.comptePrincipalService.findOne(params.account_id);
      } else {
        account = await this.compteGroupeService.findOne(params.account_id);
      }
      if (!account && params.type === 'PRINCIPAL') {
        throw new Error('Aucun compte principal trouvé');
      }
      if (!account && params.type === 'GROUP') {
        throw new Error('Aucun compte groupe trouvé');
      }

      if (!invoice) {
        throw new Error('Invoice not found'); // Vérifie si la facture existe
      }

      if (createCreditNoteDto.creditNoteAmount > invoice.total) {
        throw new Error('Credit note amount exceeds invoice total amount'); // Vérifie que le montant de la note de crédit ne dépasse pas le total de la facture
      }
      // Crée la note de crédit en utilisant les données fournies
      let { id, ...invoiceWithoutId } = invoice;
      invoiceWithoutId.products = products;
      const creditNote = manager.create(Invoice, {
        ...invoiceWithoutId,
        ...createCreditNoteDto,
        products: products,
        type: 'credit_note',
        invoice_number: null, // On réinitialise le numéro de facture
      });
      if (params.type === 'PRINCIPAL') {
        creditNote.main_account = account as ComptePrincipal;
        creditNote.invoice_number = account.next_invoice_number;
        account.next_invoice_number += 1;
        await manager.save(account);
      } else {
        creditNote.group_account = account as CompteGroupe;
        creditNote.invoice_number = account.next_invoice_number;
        account.next_invoice_number += 1;
        await manager.save(account);
      }

      // Calculer les totaux en fonction des produits
      const totalHT = creditNote.products.reduce(
        (sum: number, product: any) => sum + product.price_htva,
        0,
      );
      const totalVAT6 = creditNote.products
        .filter((product: any) => product.vat === 0.06)
        .reduce((sum: number, product: any) => sum + product.tva_amount, 0);
      const totalVAT21 = creditNote.products
        .filter((product: any) => product.vat === 0.21)
        .reduce((sum: number, product: any) => sum + product.tva_amount, 0);
      const totalTTC = creditNote.products.reduce(
        (sum: number, product: any) => sum + product.total,
        0,
      );

      // Calculer le montant de la note de crédit en prenant en compte que les montants négatifs
      const totalNegative = creditNote.products.reduce(
        (sum: number, product: any) =>
          sum + (product.total < 0 ? product.total : 0),
        0,
      );

      creditNote.creditNoteAmount = totalNegative;

      const creditNoteSaved = await manager.save(creditNote);
      invoice.linkedInvoiceId = creditNoteSaved.id;
      await manager.save(invoice);
      return creditNoteSaved;
      // return null;
    });
    // Récupère la facture liée
    // Sauvegarde la note de crédit dans la base de données
  }

  async createCreditNoteWithoutInvoice(
    createCreditNoteDto: any,
    account_id: number,
    type: 'PRINCIPAL' | 'GROUP',
  ): Promise<boolean> {
    return await this.dataSource.transaction(async (manager) => {
      // Récupérer les produits lié a la note de crédit

      const products = [];

      for (const productId of createCreditNoteDto.products_id) {
        const product = await this.productService.findOne(productId);
        products.push(product);
      }

      createCreditNoteDto.products = products;

      // Récupérer le compte principal par défaut
      let account: ComptePrincipal | CompteGroupe;
      if (type === 'PRINCIPAL') {
        account = await this.comptePrincipalService.findOne(account_id);
      } else {
        account = await this.compteGroupeService.findOne(account_id);
      }
      if (!account && type === 'PRINCIPAL') {
        throw new Error('Aucun compte principal trouvé');
      }
      if (!account && type === 'GROUP') {
        throw new Error('Aucun compte groupe trouvé');
      }

      createCreditNoteDto.status = 'paid';

      // Créer la note de crédit
      let creditNote: Invoice = manager.create(Invoice, {
        client_id: createCreditNoteDto.client_id,
        invoice_date: new Date(), // Date actuelle pour la date de facture
        credit_note_date: createCreditNoteDto.credit_note_date,
        service_date: createCreditNoteDto.service_date,
        status: createCreditNoteDto.status,
        type: 'credit_note',
        payment_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours par défaut
        invoice_number: account.next_invoice_number, // Utiliser le prochain numéro de facture
      });

      // Associer le client
      creditNote.client = await this.clientService.findOne(
        createCreditNoteDto.client_id,
      );

      // Associer le compte principal
      if (type === 'PRINCIPAL') {
        creditNote.main_account = account as ComptePrincipal;
      } else {
        creditNote.group_account = account as CompteGroupe;
      }

      // Associer les produits
      creditNote.products = products;

      // Calculer les totaux
      creditNote.price_htva = await this.setTotalHtva(creditNote.products);
      creditNote.total_vat_6 = await this.setTotalTva6(creditNote.products);
      creditNote.total_vat_21 = await this.setTotalTva21(creditNote.products);
      creditNote.total =
        creditNote.price_htva +
        creditNote.total_vat_6 +
        creditNote.total_vat_21;

      // Incrémenter le numéro de facture du compte principal
      account.next_invoice_number += 1;
      await manager.save(account);
      await manager.save(creditNote);

      const pdf = await this.generateCreditNotePDF(creditNote);

      this.mailService.sendCreditNoteEmail(creditNote, pdf);

      // Sauvegarder la note de crédit
      return true;
    });
  }

  findCreditNoteByInvoiceId(creditNoteId: number) {
    return this._invoiceRepository.findOne({
      where: {
        id: creditNoteId,
        type: 'credit_note',
      },
      relations: ['products'],
    });
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

  generateCreditNotePDF(creditNote: Invoice): ArrayBuffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Configuration initiale
    doc.setFontSize(10);
    doc.setFont('helvetica');

    // Ajout des différentes sections
    this.addHeader(doc, pageWidth);
    this.addClientInfo(doc, creditNote.client, pageWidth);

    // Titre et numéro
    doc.setFontSize(28);
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    doc.text('Note de crédit', pageWidth - 60, 30, { align: 'right' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      this.formatDateBelgium(creditNote.invoice_date),
      pageWidth - 60,
      40,
      { align: 'right' },
    );
    doc.text(`N°${creditNote.invoice_number}`, pageWidth - 60, 45, {
      align: 'right',
    });

    // Informations de facturation
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Note de crédit n°${creditNote.invoice_number}`, 10, 95);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Date d'émission : ${this.formatDateBelgium(creditNote.invoice_date)}`,
      10,
      105,
    );

    // Tableau des produits et totaux
    const finalY = this.addProductsTable(
      doc,
      creditNote.products,
      'credit_note',
    );
    this.addTotals(doc, creditNote, finalY, pageWidth);
    this.addFooter(doc, pageHeight);

    return doc.output('arraybuffer');
  }
}
