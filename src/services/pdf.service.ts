import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLib } from 'pdf-lib';

@Injectable()
export class PdfService {
  async generateVirementRecap(
    date: string,
    iban: string,
    tvac: number,
    htva: number,
    tva: number,
    communication: string,
    communicationStructuree: string,
    projet: string,
    invoicePdfBuffer: Buffer,
    accountOwner: string,
  ): Promise<Buffer> {
    // Générer le récapitulatif
    const recapBuffer = await this.generateRecap(
      date,
      iban,
      tvac,
      htva,
      tva,
      communication,
      communicationStructuree,
      projet,
      accountOwner,
    );

    // Fusionner les PDFs
    const mergedPdf = await this.mergePDFs(recapBuffer, invoicePdfBuffer);
    return mergedPdf;
  }

  private async generateRecap(
    date: string,
    iban: string,
    tvac: number,
    htva: number,
    tva: number,
    communication: string,
    communicationStructuree: string,
    projet: string,
    accountOwner: string,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        compress: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Conversion des montants en nombres
      const tvacNum = Number(tvac);
      const htvaNum = Number(htva);
      const tvaNum = Number(tva);

      // Formatage de la date
      const formattedDate = this.formatDate(date);

      // En-tête
      doc
        .fontSize(20)
        .fillColor('#000000')
        .text('SONAR ARTISTS', { align: 'center' });

      // Titre
      doc
        .moveDown()
        .fontSize(16)
        .text('Récapitulatif du Virement SEPA', { align: 'center' });

      // Configuration des colonnes
      const startY = 150;
      const lineHeight = 30;
      const col1 = 100;
      const col2 = 250;
      let currentY = startY;

      // Informations de base
      doc.fontSize(10);

      // Date et Projet
      currentY = this.addLine(doc, 'Date', formattedDate, col1, col2, currentY);
      currentY = this.addLine(doc, 'Projet', projet, col1, col2, currentY);
      currentY = this.addLine(
        doc,
        'Titulaire',
        accountOwner,
        col1,
        col2,
        currentY,
      );

      // Ligne de séparation
      currentY = this.addSeparator(doc, currentY);

      // IBAN
      currentY = this.addLine(doc, 'IBAN', iban, col1, col2, currentY);

      // Ligne de séparation
      currentY = this.addSeparator(doc, currentY);

      // Montants
      currentY = this.addLine(
        doc,
        'Montant HTVA',
        `${htvaNum.toFixed(2)} €`,
        col1,
        col2,
        currentY,
      );
      currentY = this.addLine(
        doc,
        'TVA',
        `${tvaNum.toFixed(2)} €`,
        col1,
        col2,
        currentY,
      );

      // Total en gras
      doc.fontSize(12);
      currentY = this.addLine(
        doc,
        'Total TVAC',
        `${tvacNum.toFixed(2)} €`,
        col1,
        col2,
        currentY,
        true,
      );

      // Retour à la taille normale
      doc.fontSize(10);

      // Ligne de séparation
      currentY = this.addSeparator(doc, currentY);

      // Communications
      if (communication) {
        currentY = this.addLine(
          doc,
          'Communication',
          communication,
          col1,
          col2,
          currentY,
        );
      }
      if (communicationStructuree) {
        currentY = this.addLine(
          doc,
          'Communication structurée',
          communicationStructuree,
          col1,
          col2,
          currentY,
        );
      }

      doc.end();
    });
  }

  private async mergePDFs(
    recapBuffer: Buffer,
    invoicePdfBuffer: Buffer,
  ): Promise<Buffer> {
    // Créer un nouveau document PDF
    const mergedPdf = await PDFLib.create();

    // Charger les deux PDFs
    const recapDoc = await PDFLib.load(recapBuffer);
    const invoiceDoc = await PDFLib.load(invoicePdfBuffer);

    // Copier toutes les pages du récapitulatif
    const recapPages = await mergedPdf.copyPages(
      recapDoc,
      recapDoc.getPageIndices(),
    );
    recapPages.forEach((page) => mergedPdf.addPage(page));

    // Copier toutes les pages de la facture
    const invoicePages = await mergedPdf.copyPages(
      invoiceDoc,
      invoiceDoc.getPageIndices(),
    );
    invoicePages.forEach((page) => mergedPdf.addPage(page));

    // Sauvegarder le PDF fusionné
    const mergedPdfBuffer = await mergedPdf.save();
    return Buffer.from(mergedPdfBuffer);
  }

  private addLine(
    doc: PDFDocument,
    label: string,
    value: string,
    col1: number,
    col2: number,
    y: number,
    isBold: boolean = false,
  ): number {
    const lineHeight = 25;

    // Label
    doc.fillColor('#666666').text(label + ':', col1, y);

    // Value
    if (isBold) {
      doc.fillColor('#000000').text(value, col2, y, { bold: true });
    } else {
      doc.fillColor('#000000').text(value, col2, y);
    }

    return y + lineHeight;
  }

  private addSeparator(doc: PDFDocument, y: number): number {
    doc
      .moveTo(50, y + 10)
      .lineTo(545, y + 10)
      .strokeColor('#cccccc')
      .stroke();

    return y + 25;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
