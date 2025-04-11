import { Product } from '@/product/entities/product.entity';
import { ProductService } from '@/product/product.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataSource, In, Repository } from 'typeorm';
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
import * as QRCode from 'qrcode';
import { LessThan } from 'typeorm';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly COMPANY_INFO = {
    name: 'Sonar Artists ASBL',
    address: '6 rue Francisco Ferrer',
    city: '4460 Grâce-Hollogne, Belgique',
    email: 'info@sonarartists.be',
    vat: 'TVA BE0700273583',
    iban: 'BE56 1030 5642 6988', // À remplacer par l'IBAN réel
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
    @Inject(forwardRef(() => MailService))
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
    Logger.log('QUOTE FROM DB', JSON.stringify(quoteFromDB, null, 2));
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
    invoiceCreated.pdfS3Key = pdfKey;
    await this._invoiceRepository.save(invoiceCreated);

    this.mailService.sendInvoiceEmail(invoiceCreated, pdfKey);

    return await this._invoiceRepository.findOneBy({ id: invoiceCreated.id });
  }

  async save(invoice: Invoice) {
    return await this._invoiceRepository.save(invoice);
  }

  async createInvoiceFromQuote(quote: Quote) {
    const currentDate = new Date();
    let group;
    Logger.log(
      'QUOTE IN CREATE INVOICE FROM QUOTE',
      JSON.stringify(quote, null, 2),
    );
    if (quote.group_account) {
      group = await this.compteGroupeService.findOne(quote.group_account.id);
    } else {
      group = await this.comptePrincipalService.findOne(quote.main_account.id);
    }

    let invoice = new Invoice();
    invoice.invoice_date = currentDate;
    invoice.service_date = quote.service_date;

    // Correction: créer une nouvelle date pour le payment_deadline sans modifier currentDate
    const paymentDeadline = new Date(quote.service_date);
    paymentDeadline.setDate(paymentDeadline.getDate() + quote.payment_deadline);
    invoice.payment_deadline = paymentDeadline;
    invoice.validation_deadline = quote.validation_deadline;

    invoice.price_htva = quote.price_htva;
    invoice.total = quote.total;
    invoice.total_vat_21 = quote.total_vat_21;
    invoice.total_vat_6 = quote.total_vat_6;
    invoice.status = 'payment_pending';
    invoice.type = 'invoice';
    invoice.comment = quote.comment;
    // invoice.invoice_number = group.next_invoice_number;
    // group.next_invoice_number += 1;
    // await this.compteGroupeService.save(group);

    // invoice = await this.save(invoice);
    // const pdf = await this.generateInvoicePDF(quote);
    // const pdfBuffer = Buffer.from(pdf);
    // const pdfKey = await this.s3Service.uploadFileFromBuffer(
    //   pdfBuffer,
    //   'invoices',
    //   invoice.id,
    // );
    // this.mailService.sendInvoiceEmail(quote, pdfKey);
    return invoice;
  }

  private formatDateBelgium(date: Date): string {
    return new Date(date).toLocaleDateString('fr-BE');
  }

  private addHeader(doc: jsPDF, pageWidth: number): void {
    try {
      const logoData = this.assetsService.getAssetBuffer(
        'images/Groupe-30.png',
      );
      const base64Image = `data:image/png;base64,${logoData.toString('base64')}`;
      doc.addImage(
        base64Image,
        'PNG',
        this.PAGE_MARGIN,
        this.PAGE_MARGIN,
        50,
        20,
      );
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

    // Ajout des commentaires si présents
    if (invoice.comment) {
      const commentY = (doc as any).lastAutoTable.finalY + 20;

      // Titre des commentaires
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Commentaires:', this.PAGE_MARGIN, commentY);
      doc.setFont('helvetica', 'normal');

      // Division du texte en lignes
      const maxWidth = pageWidth - 2 * this.PAGE_MARGIN;
      const commentLines = doc.splitTextToSize(invoice.comment, maxWidth);

      // Affichage des lignes de commentaire
      commentLines.forEach((line: string, index: number) => {
        doc.text(line, this.PAGE_MARGIN, commentY + 7 + index * 5);
      });
    }
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

  private async generatePaymentQRCode(
    invoice: Invoice,
    client: any,
  ): Promise<string> {
    // Format EPC069-12 pour les virements SEPA
    const reference = `facture_${new Date().getFullYear()}/000${
      invoice.invoice_number
    }`;
    const qrData = [
      'BCD', // Service Tag
      '002', // Version
      '1', // Character Set
      'SCT', // Identification
      this.COMPANY_INFO.bic, // BIC
      this.COMPANY_INFO.name, // Nom du bénéficiaire
      this.COMPANY_INFO.iban, // IBAN
      `EUR${Math.abs(invoice.total).toFixed(2)}`, // Montant
      '', // Purpose (peut être laissé vide)
      reference, // Référence personnalisée
      `FACTURE ${new Date().getFullYear()}/000${invoice.invoice_number} - ${this.formatDateBelgium(
        invoice.invoice_date,
      )}`, // Description détaillée
    ].join('\n');

    try {
      // Optimisation de la génération du QR code
      return await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 0,
        scale: 4,
        errorCorrectionLevel: 'L',
      });
    } catch (err) {
      this.logger.error('Erreur lors de la génération du QR code:', err);
      return '';
    }
  }

  private async addPaymentQRCode(
    doc: jsPDF,
    invoice: Invoice,
    client: any,
    yPosition: number,
    pageWidth: number,
  ): Promise<void> {
    const qrCodeDataUrl = await this.generatePaymentQRCode(invoice, client);
    if (qrCodeDataUrl) {
      // Réduction de la taille du QR code
      const qrCodeWidth = 30; // Réduit de 40 à 30
      const qrCodeHeight = 30; // Réduit de 40 à 30
      const qrCodeX = this.PAGE_MARGIN;
      const qrCodeY = yPosition + 20; // Réduit encore plus l'espace vertical

      // Optimisation de l'ajout du QR code
      doc.addImage(
        qrCodeDataUrl,
        'PNG',
        qrCodeX,
        qrCodeY,
        qrCodeWidth,
        qrCodeHeight,
        undefined,
        'MEDIUM',
      );

      // Ajout des informations de paiement à côté du QR code
      doc.setFontSize(8); // Réduit de 9 à 8
      doc.setTextColor(0);
      let textY = qrCodeY + 5;
      doc.text('Informations de paiement:', qrCodeX + qrCodeWidth + 10, textY);
      textY += 6; // Réduit l'espacement vertical de 8 à 6
      doc.text(
        `IBAN: ${this.COMPANY_INFO.iban}`,
        qrCodeX + qrCodeWidth + 10,
        textY,
      );
      textY += 6; // Réduit l'espacement vertical de 8 à 6
      doc.text(
        `BIC: ${this.COMPANY_INFO.bic}`,
        qrCodeX + qrCodeWidth + 10,
        textY,
      );
      textY += 6; // Réduit l'espacement vertical de 8 à 6
      const reference = `facture N°${new Date().getFullYear()}/000${
        invoice.invoice_number
      }`;
      doc.text(
        `Communication: ${reference}`,
        qrCodeX + qrCodeWidth + 10,
        textY,
      );

      // Ajout des conditions de paiement en dessous du QR code
      // Calcul de la position pour éviter le chevauchement avec le pied de page
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerStartY = pageHeight - 45; // Position de début du footer
      const conditionsPaiement =
        "Toute somme non payée à son échéance porte intérêt de retard de plein droit et sans mise en demeure préalable au taux de 12 % l'an. En cas de non-paiement à l'échéance, les factures sont majorées de plein droit d'une indemnité forfaitaire de 15 % à titre de dommages et intérêts conventionnels avec un minimum de 150 euros et indépendamment des intérêts de retard.";

      // Positionnement des conditions de paiement
      const conditionsY = qrCodeY + qrCodeHeight + 8; // Réduit l'espace après le QR code

      // Toujours afficher les conditions, mais adapter la taille et la position
      doc.setFontSize(7); // Taille de police réduite
      doc.setFont('helvetica', 'bold');
      doc.text('Conditions de paiement:', qrCodeX, conditionsY);

      doc.setFont('helvetica', 'normal');
      const maxWidth = pageWidth - 2 * this.PAGE_MARGIN;

      // Calculer l'espace disponible entre les conditions et le footer
      const availableHeight = footerStartY - conditionsY - 8;

      // Adapter la taille de police en fonction de l'espace disponible
      if (availableHeight < 30) {
        // Très peu d'espace disponible, utiliser une police très petite
        doc.setFontSize(6);
      } else if (availableHeight < 40) {
        // Espace limité, utiliser une petite police
        doc.setFontSize(6.5);
      }

      // Diviser le texte pour qu'il s'adapte à la largeur disponible
      const splitText = doc.splitTextToSize(conditionsPaiement, maxWidth);

      // Estimer la hauteur du texte
      const textHeight = splitText.length * 3; // Approximation de la hauteur (3 points par ligne)

      // Si le texte risque de dépasser le footer, réduire encore la taille
      if (conditionsY + 6 + textHeight > footerStartY) {
        // Réduire davantage la taille de police
        doc.setFontSize(5.5);
        const splitTextSmaller = doc.splitTextToSize(
          conditionsPaiement,
          maxWidth,
        );
        doc.text(splitTextSmaller, qrCodeX, conditionsY + 6);
      } else {
        // Sinon, utiliser la taille déjà définie
        doc.text(splitText, qrCodeX, conditionsY + 6);
      }
    }
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
        'images/Groupe-30.png',
      );
      const base64Image = `data:image/png;base64,${logoData.toString('base64')}`;
      doc.addImage(
        base64Image,
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
    doc.text(
      `N°${new Date().getFullYear()}/000${invoice.invoice_number}`,
      pageWidth - this.PAGE_MARGIN,
      55,
      {
        align: 'right',
      },
    );

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
      `Facture N°${new Date().getFullYear()}/000${invoice.invoice_number}`,
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

    // Ajouter le QR code seulement pour les factures (pas pour les notes de crédit)
    if (invoice.type !== 'credit_note') {
      await this.addPaymentQRCode(
        doc,
        invoice,
        quote.client,
        finalY,
        pageWidth,
      );
    }

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

        // Correction: créer une nouvelle date pour le payment_deadline sans modifier currentDate
        const paymentDeadline = new Date(currentDate);
        paymentDeadline.setDate(
          paymentDeadline.getDate() + quote.payment_deadline,
        );
        invoice.payment_deadline = paymentDeadline;
        invoice.comment = quote.comment;
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
        invoiceCreated.pdfS3Key = pdfKey;
        this.mailService.sendInvoiceEmail(invoiceCreated, pdfKey);
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

      // Recalculer les montants des produits en fonction de isVatIncluded
      if (createCreditNoteDto.isVatIncluded) {
        await Promise.all(
          products.map(async (product) => {
            // Si TVA incluse, on recalcule les montants HTVA
            const priceWithVAT = product.price * product.quantity;
            const vatRate = product.vat;
            const priceHTVA = priceWithVAT / (1 + vatRate);
            const tvaAmount = priceWithVAT - priceHTVA;

            // Mettre à jour le produit dans la base de données
            product.price_htva = priceHTVA;
            product.tva_amount = tvaAmount;
            product.total = priceWithVAT;
            return await this.productService.saveProduct(product);
          }),
        );
      } else {
        await Promise.all(
          products.map(async (product) => {
            // Si TVA non incluse, on recalcule les montants avec TVA
            const priceHTVA = product.price * product.quantity;
            const tvaAmount = priceHTVA * product.vat;
            const total = priceHTVA + tvaAmount;

            // Mettre à jour le produit dans la base de données
            product.price_htva = priceHTVA;
            product.tva_amount = tvaAmount;
            product.total = total;
            return await this.productService.saveProduct(product);
          }),
        );
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
        isVatIncluded: createCreditNoteDto.isVatIncluded,
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
    });
  }

  // Tâche CRON pour envoyer les rappels de paiement
  @Cron(CronExpression.EVERY_DAY_AT_8AM) // Exécute tous les jours à 9h
  async sendPaymentReminders() {
    this.logger.log('Vérification des factures impayées pour les rappels...');
    const today = new Date();

    // Récupérer les factures impayées dont l'échéance est passée
    const overdueInvoices = await this._invoiceRepository.find({
      where: {
        status: In([
          'payment_pending',
          'first_reminder_sent',
          'second_reminder_sent',
          'final_notice_sent', // Ou un autre statut indiquant non payé
        ]),
        payment_deadline: LessThan(today),
        type: 'invoice', // Ne pas envoyer de rappels pour les notes de crédit
      },
      relations: ['client'], // Assurez-vous que le client est chargé
    });

    this.logger.log(
      `Nombre de factures impayées trouvées : ${overdueInvoices.length}`,
    );

    for (const invoice of overdueInvoices) {
      const deadline = new Date(invoice.payment_deadline);
      const daysOverdue = Math.floor(
        (today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24),
      );

      this.logger.debug('daysOverdue', daysOverdue);
      this.logger.debug('invoice.reminder_level', invoice.reminder_level);
      this.logger.debug('invoice.status', invoice.status);

      const companyName = this.COMPANY_INFO.name;
      const iban = this.COMPANY_INFO.iban;
      const bic = this.COMPANY_INFO.bic;
      const communication = `Facture N°${new Date(invoice.invoice_date).getFullYear()}/000${invoice.invoice_number}`;

      let pdfContent: Buffer | null = null;
      if (invoice.pdfS3Key) {
        try {
          pdfContent = await this.s3Service.getFile(invoice.pdfS3Key);
        } catch (s3Error) {
          this.logger.error(
            `Impossible de récupérer le PDF depuis S3 pour la facture ${invoice.invoice_number} (clé: ${invoice.pdfS3Key}): ${s3Error.message}`,
          );
        }
      } else {
        this.logger.warn(
          `Aucune clé S3 trouvée pour la facture ${invoice.invoice_number}, le rappel sera envoyé sans PDF.`,
        );
      }

      try {
        if (
          daysOverdue >= 30 &&
          invoice.reminder_level < 3 &&
          invoice.status !== 'paid' // Vérification supplémentaire
        ) {
          // 3ème rappel : Mise en demeure
          this.logger.log(
            `Envoi de la mise en demeure pour la facture ${invoice.invoice_number}`,
          );
          await this.mailService.sendFinalNoticeEmail(
            invoice,
            companyName,
            iban,
            bic,
            communication,
            pdfContent,
          );
          invoice.reminder_level = 3;
          invoice.status = 'final_notice_sent'; // Mettre à jour le statut
          await this._invoiceRepository.save(invoice);
        } else if (
          daysOverdue >= 20 &&
          invoice.reminder_level < 2 &&
          invoice.status !== 'paid'
        ) {
          // 2ème rappel
          this.logger.log(
            `Envoi du deuxième rappel pour la facture ${invoice.invoice_number}`,
          );
          await this.mailService.sendSecondReminderEmail(
            invoice,
            companyName,
            iban,
            bic,
            communication,
            pdfContent,
          );
          invoice.reminder_level = 2;
          invoice.status = 'second_reminder_sent'; // Mettre à jour le statut
          await this._invoiceRepository.save(invoice);
        } else if (
          daysOverdue >= 10 &&
          invoice.reminder_level < 1 &&
          invoice.status !== 'paid'
        ) {
          // 1er rappel
          this.logger.log(
            `Envoi du premier rappel pour la facture ${invoice.invoice_number}`,
          );
          await this.mailService.sendFirstReminderEmail(
            invoice,
            companyName,
            iban,
            bic,
            communication,
            pdfContent,
          );
          invoice.reminder_level = 1;
          invoice.status = 'first_reminder_sent'; // Mettre à jour le statut
          await this._invoiceRepository.save(invoice);
        }
      } catch (error) {
        this.logger.error(
          `Erreur lors de l'envoi du rappel pour la facture ${invoice.invoice_number}: ${error.message}`,
        );
      }
    }
    this.logger.log('Vérification des rappels terminée.');
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

      // Recalculer les montants des produits en fonction de isVatIncluded
      if (createCreditNoteDto.isVatIncluded) {
        await Promise.all(
          products.map(async (product) => {
            // Si TVA incluse, on recalcule les montants HTVA
            const priceWithVAT = product.price * product.quantity;
            const vatRate = product.vat;
            const priceHTVA = priceWithVAT / (1 + vatRate);
            const tvaAmount = priceWithVAT - priceHTVA;

            // Mettre à jour le produit dans la base de données
            product.price_htva = priceHTVA;
            product.tva_amount = tvaAmount;
            product.total = priceWithVAT;
            return await this.productService.saveProduct(product);
          }),
        );
      } else {
        await Promise.all(
          products.map(async (product) => {
            // Si TVA non incluse, on recalcule les montants avec TVA
            const priceHTVA = product.price * product.quantity;
            const tvaAmount = priceHTVA * product.vat;
            const total = priceHTVA + tvaAmount;

            // Mettre à jour le produit dans la base de données
            product.price_htva = priceHTVA;
            product.tva_amount = tvaAmount;
            product.total = total;
            return await this.productService.saveProduct(product);
          }),
        );
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
        isVatIncluded: createCreditNoteDto.isVatIncluded,
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

      this.mailService.sendCreditNoteEmail(creditNote, Buffer.from(pdf));

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

    // Couleur principale pour le design (identique à generateInvoicePDF)
    const mainColor = [200, 192, 77] as [number, number, number];

    // Logo (identique à generateInvoicePDF)
    try {
      const logoData = this.assetsService.getAssetBuffer(
        'images/Groupe-30.png',
      );
      const base64Image = `data:image/png;base64,${logoData.toString('base64')}`;
      doc.addImage(
        base64Image,
        'PNG',
        this.PAGE_MARGIN,
        this.PAGE_MARGIN,
        50,
        20,
      );
    } catch (error) {
      this.logger.warn(`Impossible de charger le logo: ${error.message}`);
    }

    // Titre "Note de crédit" en haut à droite (style generateInvoicePDF)
    doc.setFontSize(28);
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    doc.text('Note de crédit', pageWidth - this.PAGE_MARGIN, 35, {
      align: 'right',
    });

    // Date et numéro de note de crédit (style generateInvoicePDF)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      this.formatDateBelgium(creditNote.invoice_date), // Utilise invoice_date comme date d'émission
      pageWidth - this.PAGE_MARGIN,
      45,
      { align: 'right' },
    );
    // Utilisation de l'année actuelle pour la numérotation comme dans generateInvoicePDF
    const creditNoteYear = new Date(creditNote.invoice_date).getFullYear();
    doc.text(
      `N°${creditNoteYear}/000${creditNote.invoice_number}`,
      pageWidth - this.PAGE_MARGIN,
      55,
      {
        align: 'right',
      },
    );

    // Informations de l'émetteur (style generateInvoicePDF)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(this.COMPANY_INFO.name, this.PAGE_MARGIN, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, this.PAGE_MARGIN, 75);
    doc.text(this.COMPANY_INFO.city, this.PAGE_MARGIN, 80);
    doc.text(`Email: ${this.COMPANY_INFO.email}`, this.PAGE_MARGIN, 85);
    doc.text(this.COMPANY_INFO.vat, this.PAGE_MARGIN, 90);

    // Informations du client (style generateInvoicePDF)
    if (creditNote.client) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(creditNote.client.name, pageWidth - this.PAGE_MARGIN - 60, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${creditNote.client.street} ${creditNote.client.number}`,
        pageWidth - this.PAGE_MARGIN - 60,
        75,
      );
      doc.text(
        `${creditNote.client.postalCode} ${creditNote.client.city}`,
        pageWidth - this.PAGE_MARGIN - 60,
        80,
      );
      if (creditNote.client.company_vat_number) {
        doc.text(
          creditNote.client.company_vat_number,
          pageWidth - this.PAGE_MARGIN - 60,
          85,
        );
      }
    } else {
      this.logger.warn(
        `Client non trouvé pour la note de crédit ID: ${creditNote.id}`,
      );
      doc.text('Client non spécifié', pageWidth - this.PAGE_MARGIN - 60, 70);
    }

    // Titre du document (style generateInvoicePDF)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Note de crédit N°${creditNoteYear}/000${creditNote.invoice_number}`,
      this.PAGE_MARGIN,
      105,
    );

    // Date d'émission (équivalent du délai de paiement dans generateInvoicePDF)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Date d'émission : ${this.formatDateBelgium(creditNote.invoice_date)}`,
      pageWidth - this.PAGE_MARGIN,
      115, // Position Y similaire au payment_deadline de generateInvoicePDF
      { align: 'right' },
    );

    // Tableau des produits (style generateInvoicePDF)
    const startY = 125;
    autoTable(doc, {
      head: [
        ['Description', 'Quantité', 'Prix unitaire HT', 'TVA', 'Total HT'],
      ],
      body: creditNote.products.map((product) => [
        product.description,
        product.quantity.toString(),
        `${product.price_htva.toFixed(2)}€`, // Assumer que price_htva est correct pour NC
        `${(product.vat * 100).toFixed(0)}%`,
        `${(product.price_htva * product.quantity).toFixed(2)}€`, // Assumer total HT par ligne
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
        halign: 'center', // Centré par défaut pour l'en-tête
      },
      columnStyles: {
        // Styles des colonnes comme dans generateInvoicePDF
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 40, halign: 'right' },
      },
      // Configuration spécifique pour les en-têtes de colonnes comme dans generateInvoicePDF
      willDrawCell: function (data) {
        if (data.row.section === 'head') {
          if (data.column.index === 0) {
            data.cell.styles.halign = 'left';
          } else if (data.column.index === 1 || data.column.index === 3) {
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

    // Sous-total et TVA (style generateInvoicePDF)
    // Vérifier que les totaux existent sur creditNote avant de les utiliser
    const priceHtva = creditNote.price_htva ?? 0;
    const totalVat6 = creditNote.total_vat_6 ?? 0;
    const totalVat21 = creditNote.total_vat_21 ?? 0;
    const total = creditNote.total ?? 0;

    autoTable(doc, {
      body: [
        ['Sous-total', `${priceHtva.toFixed(2)}€`],
        ['TVA 6%', `${totalVat6.toFixed(2)}€`],
        ['TVA 21%', `${totalVat21.toFixed(2)}€`],
        ['Total', `${total.toFixed(2)}€`], // Utiliser le total de la note de crédit
      ],
      startY: finalY,
      styles: {
        fontSize: 9,
        cellPadding: 3, // Ajusté comme generateInvoicePDF
      },
      theme: 'plain', // Thème comme generateInvoicePDF
      columnStyles: {
        // Styles comme generateInvoicePDF
        0: { cellWidth: 40, halign: 'left' }, // Note: generateInvoicePDF a 'left' ici
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: pageWidth - 100 }, // Marge comme generateInvoicePDF
      // didDrawCell n'est pas nécessaire ici car pas de ligne "Solde" spéciale
    });

    // Ajout des commentaires si présents (repris de l'ancienne méthode addTotals)
    let lastTableY = (doc as any).lastAutoTable.finalY;
    if (creditNote.comment) {
      const commentY = lastTableY + 15; // Espace après le tableau des totaux

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Commentaires:', this.PAGE_MARGIN, commentY);
      doc.setFont('helvetica', 'normal');

      const maxWidth = pageWidth - 2 * this.PAGE_MARGIN;
      const commentLines = doc.splitTextToSize(creditNote.comment, maxWidth);

      commentLines.forEach((line: string, index: number) => {
        doc.text(line, this.PAGE_MARGIN, commentY + 7 + index * 5);
      });
      // Mettre à jour la position Y si des commentaires sont ajoutés
      lastTableY = commentY + 7 + (commentLines.length - 1) * 5 + 5;
    }

    // Pied de page (style generateInvoicePDF)
    const footerY = pageHeight - 30; // Position Y comme generateInvoicePDF

    const col1X = this.PAGE_MARGIN;
    const col2X = pageWidth / 3;
    const col3X = (pageWidth / 3) * 2 - 10;

    doc.setFontSize(8); // Taille de police comme generateInvoicePDF footer
    doc.setTextColor(100); // Couleur comme generateInvoicePDF footer

    // Colonne 1 - Siège social
    doc.setFont('helvetica', 'bold');
    doc.text('Siège social', col1X, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, col1X, footerY + 5);
    doc.text(this.COMPANY_INFO.city.split(',')[0], col1X, footerY + 10); // Juste la ville
    doc.text('Belgique', col1X, footerY + 15);
    doc.text(this.COMPANY_INFO.vat.replace('TVA ', ''), col1X, footerY + 20); // Juste le numéro

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
}
