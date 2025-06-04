import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { MailService } from '../mail/mail.services';
import { UsersService } from '../users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComptePrincipal } from '../compte_principal/entities/compte_principal.entity';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { S3Service } from '@/services/s3/s3.service';
import { InvoiceService } from '@/invoice/invoice.service';
import { GlobalCounterService } from '../global-counter/global-counter.service';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { SendNotificationDto } from '../push-notification/dto/send-notification.dto';
import { NotificationService } from '../notification/notification.service';
import sanitizeHtml from 'sanitize-html';
import { LessThan } from 'typeorm';

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
    @Inject(forwardRef(() => MailService))
    private readonly mailService: MailService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    private readonly globalCounterService: GlobalCounterService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationService: NotificationService,
  ) {}

  // Définir les options de sanitization
  private sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'p',
      'a',
      'ul',
      'ol',
      'nl',
      'li',
      'b',
      'i',
      'strong',
      'em',
      'strike',
      'abbr',
      'code',
      'hr',
      'br',
      'div',
      'table',
      'thead',
      'caption',
      'tbody',
      'tr',
      'th',
      'td',
      'pre',
      'span',
      'u',
      's',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target'],
      // Autoriser les attributs pour d'autres balises si nécessaire
      // exemple: img: [ 'src', 'alt' ]
      '*': ['class', 'style'], // Autoriser class et style sur toutes les balises (à ajuster si trop permissif)
    },
    // Autoriser les schémas d'URL sûrs
    allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: true,
    enforceHtmlBoundary: false,
    // Transformer les liens pour qu'ils s'ouvrent dans un nouvel onglet par défaut
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  };

  // Fonction utilitaire pour formater les dates au format DD/MM/YYYY
  private formatDate(dateValue: string | Date): string {
    if (typeof dateValue === 'string') {
      // Si c'est une chaîne au format YYYY-MM-DD
      const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [_, year, month, day] = match;
        return `${day}/${month}/${year}`;
      }
      return dateValue; // Retourner la chaîne telle quelle si elle n'est pas au format YYYY-MM-DD
    } else if (dateValue instanceof Date) {
      return `${dateValue.getDate().toString().padStart(2, '0')}/${(dateValue.getMonth() + 1).toString().padStart(2, '0')}/${dateValue.getFullYear()}`;
    }
    // Valeur par défaut: date actuelle
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  }

  private async updateAccountAndGetQuoteNumber(
    accountId: number | undefined,
    accountType: 'main' | 'group',
  ): Promise<{
    account: ComptePrincipal | CompteGroupe;
    quoteNumber: number;
  } | null> {
    if (!accountId) {
      return null;
    }

    const service =
      accountType === 'main'
        ? this.comptePrincipalService
        : this.compteGroupeService;

    const account = await service.findOne(accountId);

    // Utiliser le compteur global au lieu du compteur local
    const quoteNumber = await this.globalCounterService.getNextQuoteNumber();

    // Ne plus incrémenter le compteur local
    // account.next_quote_number += 1;
    await service.save(account as ComptePrincipal);

    return { account, quoteNumber };
  }

  private calculateTotals(products: Product[]): {
    totalHtva: number;
    totalVat6: number;
    totalVat21: number;
    total: number;
  } {
    const result = products.reduce(
      (acc, product) => {
        acc.totalHtva += product.price_htva;
        if (product.vat === 0.06) {
          acc.totalVat6 += product.tva_amount;
        } else if (product.vat === 0.21) {
          acc.totalVat21 += product.tva_amount;
        }
        return acc;
      },
      {
        totalHtva: 0,
        totalVat6: 0,
        totalVat21: 0,
        total: 0,
      },
    );

    result.total = result.totalHtva + result.totalVat6 + result.totalVat21;
    return result;
  }

  private extractFileName(path: string): string {
    const match = path.match(/attachments\/(.*)/);
    return match ? match[1] : path;
  }

  async create(
    createQuoteDto: CreateQuoteDto,
    user_id: number,
    files: Express.Multer.File[],
    isDoubleValidation: boolean,
  ) {
    // Validation de base
    if (!createQuoteDto.client_id || !createQuoteDto.products_id?.length) {
      throw new BadRequestException('Client and products are required');
    }

    // Sanitize le commentaire AVANT de créer l'entité
    if (createQuoteDto.comment) {
      createQuoteDto.comment = sanitizeHtml(
        createQuoteDto.comment,
        this.sanitizeOptions,
      );
    }

    let quote: Quote = this.quoteRepository.create(createQuoteDto);

    // Gestion des comptes
    const mainAccountResult = await this.updateAccountAndGetQuoteNumber(
      createQuoteDto.main_account_id,
      'main',
    );
    if (mainAccountResult) {
      quote.main_account = mainAccountResult.account as ComptePrincipal;
      quote.quote_number = mainAccountResult.quoteNumber;
      quote.created_by_project_name = mainAccountResult.account.username;
    }

    const groupAccountResult = await this.updateAccountAndGetQuoteNumber(
      createQuoteDto.group_account_id,
      'group',
    );
    if (groupAccountResult) {
      quote.group_account = groupAccountResult.account as CompteGroupe;
      quote.quote_number = groupAccountResult.quoteNumber;
      quote.created_by_project_name = groupAccountResult.account.username;
    }

    // Récupération du client
    quote.client = await this.clientService.findOne(createQuoteDto.client_id);

    // Définir si les infos client sont requises
    quote.client_info_required = quote.client.is_info_pending;

    // Récupération des produits
    const productPromises = createQuoteDto.products_id.map((id) =>
      this.productService.findOne(id),
    );
    let products = await Promise.all(productPromises);

    // Recalculer les montants des produits en fonction de isVatIncluded
    if (createQuoteDto.isVatIncluded) {
      products = await Promise.all(
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
      products = await Promise.all(
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

    quote.products = products;

    // Calcul des totaux
    const totals = this.calculateTotals(quote.products);
    quote.price_htva = totals.totalHtva;
    quote.total_vat_6 = totals.totalVat6;
    quote.total_vat_21 = totals.totalVat21;
    quote.total = totals.totalHtva + totals.totalVat6 + totals.totalVat21;
    quote.isVatIncluded = createQuoteDto.isVatIncluded;

    // Gestion de la date de validation
    if (!createQuoteDto.validation_deadline) {
      const currentDate = new Date();
      quote.validation_deadline = new Date(currentDate.getMonth() + 1);
    } else {
      quote.validation_deadline = createQuoteDto.validation_deadline;
    }

    // Gestion des attachements
    let attachments_mail: Buffer[] = [];
    let attachment_urls: string[] = [];

    // D'abord traiter les pièces jointes existantes si présentes
    // if (
    //   createQuoteDto.attachment_keys &&
    //   createQuoteDto.attachment_keys.length > 0
    // ) {
    //   try {
    //     Logger.debug(
    //       `[QuotesService] Processing existing attachments: ${createQuoteDto.attachment_keys}`,
    //     );

    //     for (const key of createQuoteDto.attachment_keys) {
    //       // Récupérer le fichier S3 pour l'email
    //       const fileBuffer = await this.s3Service.getFile(key.split('/').pop());
    //       attachments_mail.push(fileBuffer);

    //       // Ajouter l'URL au tableau
    //       attachment_urls.push(this.s3Service.getFileUrl(key));
    //     }
    //   } catch (error) {
    //     Logger.error(
    //       `Erreur lors de la récupération des fichiers S3: ${error.message}`,
    //     );
    //   }
    // }

    //Ensuite traiter les nouveaux fichiers
    if (files && files.length > 0) {
      try {
        for (const file of files) {
          // Upload du fichier sur S3
          const attachment_key = await this.s3Service.uploadFile(
            file,
            `quote/${quote.created_by_project_name}/${quote.quote_number}`,
          );

          // Stocker l'URL dans le tableau
          attachment_urls.push(this.s3Service.getFileUrl(attachment_key));

          // Ajouter le buffer pour l'email
          attachments_mail.push(file.buffer);
        }
      } catch (error) {
        Logger.error(
          `Erreur lors de la gestion des fichiers: ${error.message}`,
        );
      }
    }

    // Assigner toutes les URLs au devis
    quote.attachment_url = attachment_urls;

    // Définir created_by_mail AVANT de sauvegarder
    const userConnected = await this.usersService.findOne(user_id);
    quote.created_by_mail = userConnected.email;
    Logger.log('[QuoteService] isDoubleValidation', isDoubleValidation);
    if (isDoubleValidation !== true) {
      Logger.log('updateQuoteGroupAcceptance');
      quote.group_acceptance = 'accepted';
    }
    quote = await this.quoteRepository.save(quote);

    // Envoi des emails avec les pièces jointes
    const sendEmail = async (
      email: string,
      name: string,
      role: 'CLIENT' | 'GROUP',
    ) => {
      // Déterminer si les infos client sont nécessaires pour cet email spécifique
      const needsClientInfo = role === 'CLIENT' && quote.client_info_required;

      if (attachments_mail.length === 0) {
        // Pas de pièces jointes, envoyer un email simple
        await this.mailService.sendDevisAcceptationEmail(
          email,
          name,
          quote.id,
          role,
          email,
          this.formatDate(quote.quote_date),
          quote.comment,
          quote.price_htva,
          quote.client.name,
          role === 'GROUP' ? userConnected.name : '',
          [],
          [],
          quote.created_by_project_name,
          false, // isUpdate
          needsClientInfo, // needsClientInfo
          createQuoteDto.message,
        );
        return;
      }

      // Extraire les noms de fichiers des URLs
      const fileNames = attachment_urls.map(
        (url) => url.split('/').pop() || 'attachment.pdf',
      );

      // Envoyer l'email avec toutes les pièces jointes
      await this.mailService.sendDevisAcceptationEmail(
        email,
        name,
        quote.id,
        role,
        email,
        this.formatDate(quote.quote_date),
        quote.comment,
        quote.price_htva,
        quote.client.name,
        role === 'GROUP' ? userConnected.name : '',
        attachment_urls,
        fileNames,
        quote.created_by_project_name,
        false, // isUpdate
        needsClientInfo, // needsClientInfo
        createQuoteDto.message,
      );
    };

    // Envoyer les emails en parallèle
    await Promise.all([
      sendEmail(quote.client.email, quote.client.name, 'CLIENT'),
      isDoubleValidation
        ? sendEmail(userConnected.email, userConnected.firstName, 'GROUP')
        : null,
    ]);

    return quote ? true : false;
  }

  findAll() {
    return this.quoteRepository.find({ relations: { products: false } });
  }

  findOne(id: number) {
    return this.quoteRepository.findOne({
      where: { id },
      relations: {
        products: true,
        client: true,
        group_account: true,
        main_account: true,
        // Ne pas charger invoice pour éviter la boucle
      },
    });
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
  async save(quote: Quote) {
    return await this.quoteRepository.save(quote);
  }

  async update(
    id: string,
    updateQuoteDto: UpdateQuoteDto,
    user_id: number,
    files: Express.Multer.File[],
    isDoubleValidation: boolean,
  ) {
    let quote: Quote = await this.findOne(+id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Validation de base
    if (!updateQuoteDto.client_id || !updateQuoteDto.products_id?.length) {
      throw new BadRequestException('Client and products are required');
    }

    // Sanitize le commentaire AVANT de l'appliquer à l'entité
    let sanitizedComment: string | undefined = undefined;
    if (updateQuoteDto.comment !== undefined) {
      sanitizedComment = sanitizeHtml(
        updateQuoteDto.comment,
        this.sanitizeOptions,
      );
    }

    // Mise à jour des données de base
    quote.quote_date = updateQuoteDto.quote_date;
    quote.service_date = updateQuoteDto.service_date;
    quote.payment_deadline = updateQuoteDto.payment_deadline;
    quote.client = await this.clientService.findOne(updateQuoteDto.client_id);
    quote.isVatIncluded = updateQuoteDto.isVatIncluded; // Assigner isVatIncluded ici

    // Mettre à jour si les infos client sont requises
    quote.client_info_required = quote.client.is_info_pending;

    // Appliquer le commentaire sanitisé s'il existe
    if (sanitizedComment !== undefined) {
      quote.comment = sanitizedComment;
    }

    // Récupération et mise à jour des produits
    const productPromises = updateQuoteDto.products_id.map((id) =>
      this.productService.findOne(id),
    );
    let products = await Promise.all(productPromises);

    // Recalculer les montants des produits en fonction de isVatIncluded
    if (updateQuoteDto.isVatIncluded) {
      products = await Promise.all(
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
      products = await Promise.all(
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

    quote.products = products;

    // Calcul des totaux
    const totals = this.calculateTotals(quote.products);
    quote.price_htva = totals.totalHtva;
    quote.total_vat_6 = totals.totalVat6;
    quote.total_vat_21 = totals.totalVat21;
    quote.total = totals.total;
    quote.isVatIncluded = updateQuoteDto.isVatIncluded;

    // Gestion de la date de validation
    if (!updateQuoteDto.validation_deadline) {
      const currentDate = new Date();
      quote.validation_deadline = new Date(currentDate.getMonth() + 1);
    } else {
      quote.validation_deadline = updateQuoteDto.validation_deadline;
    }

    // Gestion des attachements
    let attachments_mail: Buffer[] = [];
    let attachment_urls: string[] = [];

    // D'abord traiter les pièces jointes existantes si présentes
    if (
      updateQuoteDto.attachment_keys &&
      updateQuoteDto.attachment_keys.length > 0
    ) {
      try {
        // Convertir les clés en URLs pour la comparaison
        const keepUrls = updateQuoteDto.attachment_keys.map((key) =>
          this.s3Service.getFileUrl(key),
        );

        // Filtrer les URLs existantes pour ne garder que celles qui sont dans attachment_keys
        if (quote.attachment_url) {
          attachment_urls = quote.attachment_url.filter((url) =>
            keepUrls.includes(url),
          );
        }

        // Récupérer les fichiers pour l'email
        for (const key of updateQuoteDto.attachment_keys) {
          try {
            const fileBuffer = await this.s3Service.getFile(key);
            attachments_mail.push(fileBuffer);
          } catch (error) {
            Logger.error(
              `Erreur lors de la récupération du fichier S3 ${key}:`,
              error,
            );
          }
        }
      } catch (error) {
        Logger.error(
          `Erreur lors de la récupération des fichiers S3: ${error.message}`,
        );
      }
    } else {
      // Si aucune clé n'est fournie, cela signifie que toutes les pièces jointes ont été supprimées
      attachment_urls = [];
    }

    // Ensuite traiter les nouveaux fichiers
    if (files && files.length > 0) {
      try {
        for (const file of files) {
          try {
            // Upload du fichier sur S3
            const attachment_key = await this.s3Service.uploadFile(
              file,
              `quote/${quote.quote_number}/${file.originalname}`,
            );

            // Stocker l'URL dans le tableau
            const fileUrl = this.s3Service.getFileUrl(attachment_key);
            attachment_urls.push(fileUrl);

            // Ajouter le buffer pour l'email
            attachments_mail.push(file.buffer);
          } catch (error) {
            Logger.error(
              `Erreur lors de l'upload du fichier ${file.originalname}:`,
              error,
            );
          }
        }
      } catch (error) {
        Logger.error(
          `Erreur lors de la gestion des fichiers: ${error.message}`,
        );
      }
    }

    // Assigner les URLs au devis
    quote.attachment_url = attachment_urls;

    // Mise à jour des statuts
    quote.group_acceptance = 'pending';
    quote.order_giver_acceptance = 'pending';

    if (isDoubleValidation !== true) {
      Logger.log('updateQuoteGroupAcceptance IN UPDATE');
      quote.group_acceptance = 'accepted';
    }

    // Sauvegarde du devis
    try {
      quote = await this.quoteRepository.save(quote);
    } catch (error) {
      Logger.error('Erreur lors de la sauvegarde du devis:', error);
      throw new BadRequestException('Erreur lors de la sauvegarde du devis');
    }

    // Envoi des emails avec les pièces jointes
    const userConnected = await this.usersService.findOne(user_id);

    const sendEmail = async (
      email: string,
      name: string,
      role: 'CLIENT' | 'GROUP',
    ) => {
      // Déterminer si les infos client sont nécessaires pour cet email spécifique
      const needsClientInfo = role === 'CLIENT' && quote.client_info_required;

      if (attachments_mail.length === 0) {
        // Pas de pièces jointes, envoyer un email simple
        await this.mailService.sendDevisAcceptationEmail(
          email,
          name,
          quote.id,
          role,
          email,
          this.formatDate(quote.quote_date),
          quote.comment,
          quote.price_htva,
          quote.client.name,
          role === 'GROUP' ? userConnected.name : '',
          [],
          [],
          quote.created_by_project_name,
          true, // isUpdate
          needsClientInfo, // needsClientInfo
          updateQuoteDto.message,
        );
        return;
      }

      // Extraire les noms de fichiers des URLs
      const fileNames = attachment_urls.map(
        (url) => url.split('/').pop() || 'attachment.pdf',
      );

      // Envoyer l'email avec toutes les pièces jointes
      await this.mailService.sendDevisAcceptationEmail(
        email,
        name,
        quote.id,
        role,
        email,
        this.formatDate(quote.quote_date),
        quote.comment,
        quote.price_htva,
        quote.client.name,
        role === 'GROUP' ? userConnected.name : '',
        attachment_urls,
        fileNames,
        quote.created_by_project_name,
        true, // isUpdate
        needsClientInfo, // needsClientInfo
        updateQuoteDto.message,
      );
    };

    // Envoyer les emails en parallèle
    try {
      await Promise.all([
        sendEmail(quote.client.email, quote.client.name, 'CLIENT'),
        isDoubleValidation
          ? sendEmail(userConnected.email, userConnected.firstName, 'GROUP')
          : null,
      ]);
    } catch (error) {
      Logger.error("Erreur lors de l'envoi des emails:", error);
      // Ne pas bloquer la mise à jour si l'envoi des emails échoue
    }

    return quote;
  }

  private async updateQuoteStatus(
    id: number,
    type: 'group' | 'order_giver',
    status: 'accepted' | 'refused' | 'pending',
  ): Promise<Quote> {
    const quote = await this.findOne(id);
    const field = `${type}_acceptance` as
      | 'group_acceptance'
      | 'order_giver_acceptance';
    quote[field] = status;

    if (status === 'accepted') {
      const otherField =
        type === 'group' ? 'order_giver_acceptance' : 'group_acceptance';
      if (quote[otherField] === 'accepted') {
        quote.status = 'accepted';
      }
    } else if (status === 'refused') {
      const otherField =
        type === 'group' ? 'order_giver_acceptance' : 'group_acceptance';
      if (quote[otherField] === 'refused') {
        quote.status = 'refused';
      }
    } else if (status === 'pending') {
      quote.status = 'pending';
    }

    if (
      status === 'accepted' &&
      quote.validation_deadline.getTime() < new Date().getTime()
    ) {
      quote.validation_deadline = new Date(
        new Date().getTime() + 10 * 24 * 60 * 60 * 1000,
      );
    }

    if (
      quote.group_acceptance === 'accepted' &&
      quote.order_giver_acceptance === 'accepted' &&
      quote.service_date < new Date()
    ) {
      Logger.log('Création de la facture');
      quote.status = 'accepted';
      await this.invoiceService.createFacture();
    }

    const savedQuote = await this.quoteRepository.save(quote);
    await this.invoiceService.createFacture();
    return savedQuote;
  }

  async updateQuoteGroupAcceptance(id: number) {
    const quote = await this.updateQuoteStatus(id, 'group', 'accepted');

    // Envoyer un email au client pour l'informer que le groupe a accepté le devis
    if (quote.client && quote.client.email) {
      try {
        // Récupérer les informations nécessaires pour l'email
        const clientName = quote.client.name.split(' ')[0] || 'Client'; // Prénom du client
        const formattedDate = this.formatDate(quote.service_date);

        await this.mailService.sendQuoteStatusUpdateEmail(
          quote.client.email,
          clientName,
          quote.id,
          quote.quote_number.toString(),
          'accepted',
          'GROUP',
          quote.created_by_project_name,
          quote.price_htva,
          formattedDate,
          quote.client.name,
        );

        Logger.log(
          `Email de notification d'acceptation envoyé au client: ${quote.client.email}`,
        );
      } catch (error) {
        Logger.error(
          `Erreur lors de l'envoi de l'email de notification: ${error.message}`,
        );
      }
    }

    return quote;
  }

  async updateOrderGiverAcceptance(id: number) {
    const quote = await this.updateQuoteStatus(id, 'order_giver', 'accepted');

    // Envoyer un email et des notifications au groupe pour l'informer que le client a accepté le devis
    try {
      const creatorEmail = quote.created_by_mail;
      if (creatorEmail) {
        // 1. Envoi de l'email
        const creatorName =
          quote.created_by_project_name.split(' ')[0] || 'Groupe';
        const formattedDate = this.formatDate(quote.service_date);
        await this.mailService.sendQuoteStatusUpdateEmail(
          creatorEmail,
          creatorName,
          quote.id,
          quote.quote_number.toString(),
          'accepted',
          'CLIENT',
          quote.created_by_project_name,
          quote.price_htva,
          formattedDate,
          quote.client.name,
        );
        Logger.log(
          `Email de notification d'acceptation envoyé au groupe: ${creatorEmail}`,
        );

        // 2. Récupérer l'utilisateur créateur
        const creatorUser =
          await this.usersService.findOneByEmail(creatorEmail);

        if (creatorUser) {
          // 3. Envoyer la notification push
          const pushNotificationPayload: SendNotificationDto = {
            title: `Devis Accepté: N°${quote.quote_number}`,
            body: `Le devis N°${quote.quote_number} pour ${quote.client.name} a été accepté.`,
            data: {
              type: 'QUOTE_ACCEPTED',
              quoteId: quote.id.toString(),
              url: '/admin/quotes',
            },
          };
          try {
            await this.pushNotificationService.sendToUser(
              creatorUser.id,
              pushNotificationPayload,
            );
            Logger.log(
              `Notification push envoyée à l'utilisateur ${creatorUser.id} (${creatorEmail}) pour l'acceptation du devis ${quote.id}`,
            );
          } catch (pushError) {
            Logger.error(
              `Erreur lors de l'envoi de la notification push à ${creatorEmail}: ${pushError.message}`,
              pushError.stack,
            );
          }

          // 4. Créer et envoyer la notification en temps réel (WebSocket)
          try {
            await this.notificationService.create({
              userId: creatorUser.id,
              type: 'QUOTE_ACCEPTED',
              title: `Devis Accepté: N°${quote.quote_number}`,
              message: `Le devis N°${quote.quote_number} pour ${quote.client.name} a été accepté par le client.`,
              isRead: false,
              data: {
                quoteId: quote.id.toString(),
                clientId: quote.client.id.toString(),
                clientName: quote.client.name,
                url: '/admin/quotes', // Pour gérer le clic sur la notification dans le front
              },
            });
            Logger.log(
              `Notification en temps réel créée pour l'utilisateur ${creatorUser.id} (${creatorEmail}) pour l'acceptation du devis ${quote.id}`,
            );
          } catch (realtimeError) {
            Logger.error(
              `Erreur lors de la création de la notification en temps réel pour ${creatorEmail}: ${realtimeError.message}`,
              realtimeError.stack,
            );
          }
        } else {
          Logger.warn(
            `Impossible d'envoyer les notifications : Utilisateur créateur non trouvé pour l'email ${creatorEmail}`,
          );
        }
      }
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi des notifications (email/push/temps réel) après acceptation du devis ${quote.id}: ${error.message}`,
        error.stack,
      );
    }

    return quote;
  }

  async updateQuoteGroupRejection(id: number) {
    const quote = await this.updateQuoteStatus(id, 'group', 'refused');

    // Envoyer un email au client pour l'informer que le groupe a refusé le devis
    if (quote.client && quote.client.email) {
      try {
        // Récupérer les informations nécessaires pour l'email
        const clientName = quote.client.name.split(' ')[0] || 'Client'; // Prénom du client
        const formattedDate = this.formatDate(quote.service_date);

        await this.mailService.sendQuoteStatusUpdateEmail(
          quote.client.email,
          clientName,
          quote.id,
          quote.quote_number.toString(),
          'refused',
          'GROUP',
          quote.created_by_project_name,
          quote.price_htva,
          formattedDate,
          quote.client.name,
        );

        Logger.log(
          `Email de notification de refus envoyé au client: ${quote.client.email}`,
        );
      } catch (error) {
        Logger.error(
          `Erreur lors de l'envoi de l'email de notification: ${error.message}`,
        );
      }
    }

    return quote;
  }

  async updateOrderGiverRejection(id: number) {
    const quote = await this.updateQuoteStatus(id, 'order_giver', 'refused');

    // Envoyer un email au groupe pour l'informer que le client a refusé le devis
    try {
      // Récupérer l'email du créateur du devis (groupe)
      const creatorEmail = quote.created_by_mail;
      if (creatorEmail) {
        const creatorName =
          quote.created_by_project_name.split(' ')[0] || 'Groupe';
        const formattedDate = this.formatDate(quote.service_date);

        await this.mailService.sendQuoteStatusUpdateEmail(
          creatorEmail,
          creatorName,
          quote.id,
          quote.quote_number.toString(),
          'refused',
          'CLIENT',
          quote.created_by_project_name,
          quote.price_htva,
          formattedDate,
          quote.client.name,
        );

        Logger.log(
          `Email de notification de refus envoyé au groupe: ${creatorEmail}`,
        );
      }
    } catch (error) {
      Logger.error(
        `Erreur lors de l'envoi de l'email de notification: ${error.message}`,
      );
    }

    return quote;
  }

  async updateQuoteGroupRejectionCancel(id: number) {
    return this.updateQuoteStatus(id, 'group', 'pending');
  }

  async updateOrderGiverRejectionCancel(id: number) {
    return this.updateQuoteStatus(id, 'order_giver', 'pending');
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

  async findQuoteWithProducts(id: number) {
    return this.quoteRepository.findOne({
      where: { id },
      relations: {
        products: true,
        client: true,
        group_account: true,
        main_account: true,
      },
    });
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

  async updateReportDate(id: number, report_date: Date) {
    const quote = await this.findOne(id);
    if (quote.status !== 'accepted') {
      quote.validation_deadline = report_date;
      const quoteUpdated = await this.quoteRepository.save(quote);
      return quoteUpdated ? true : false;
    } else {
      throw new BadRequestException('Quote already accepted');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredQuotes() {
    Logger.log('[QuoteService] Checking for expired quotes...');
    Logger.log('[QuoteService] Current date: ' + new Date().toISOString());

    // Log the query parameters
    const currentDate = new Date();
    Logger.log('[QuoteService] Query parameters:');
    Logger.log('- status: pending');
    Logger.log('- validation_deadline < ' + currentDate.toISOString());

    const quotes = await this.quoteRepository.find({
      where: {
        status: 'pending',
        validation_deadline: LessThan(new Date()),
      },
      relations: ['client'],
    });

    Logger.log(`[QuoteService] Found ${quotes.length} expired quotes`);

    for (const quote of quotes) {
      Logger.log(`[QuoteService] Marking quote #${quote.id} as expired`);
      quote.status = 'expired';
      await this.quoteRepository.save(quote);
    }

    return quotes;
  }

  private async sendReminderEmails(
    quotes: Quote[],
    daysBeforeDeadline: number | null = null,
  ) {
    console.log('sendReminderEmails', quotes.length);

    if (quotes.length === 0) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrer les devis avant la boucle pour éviter des traitements inutiles
    const filteredQuotes = quotes.filter((quote) => {
      // Vérifier que le devis est en attente
      if (quote.status !== 'pending') {
        return false;
      }

      // Vérifier que le devis a au moins une acceptation en attente
      if (
        quote.group_acceptance !== 'pending' &&
        quote.order_giver_acceptance !== 'pending'
      ) {
        return false;
      }

      // Vérifier que la date d'échéance existe
      if (!quote.validation_deadline) {
        return false;
      }

      // Calculer le nombre de jours restants avant l'échéance
      const deadline = new Date(quote.validation_deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Envoyer un rappel uniquement si le nombre de jours restants correspond exactement
      // au paramètre daysBeforeDeadline (2 jours avant, 1 jour avant, ou le jour même)
      return diffDays === daysBeforeDeadline;
    });

    console.log(
      `Devis filtrés pour rappel à ${daysBeforeDeadline} jours de l'échéance:`,
      filteredQuotes.length,
    );

    // Traiter les devis filtrés
    for (const quote of filteredQuotes) {
      // Envoyer un email au groupe si nécessaire
      if (quote.group_acceptance === 'pending' && quote.created_by_mail) {
        await this.mailService.sendDevisAcceptationEmail(
          quote.created_by_mail,
          quote.created_by_project_name,
          quote.id,
          'GROUP',
          quote.created_by_mail,
          this.formatDate(quote.quote_date),
          quote.comment,
          quote.price_htva,
          quote.client.name,
        );
      }

      // Envoyer un email au client si nécessaire
      if (quote.order_giver_acceptance === 'pending' && quote.client?.email) {
        await this.mailService.sendDevisAcceptationEmail(
          quote.client.email,
          quote.client.name,
          quote.id,
          'CLIENT',
          quote.client.email,
          this.formatDate(quote.quote_date),
          quote.comment,
          quote.price_htva,
          quote.client.name,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminderEmailTwoDaysBefore() {
    const quotes = await this.findQuoteInPending();
    await this.sendReminderEmails(quotes, 2); // 2 jours avant l'échéance
  }

  findQuoteInPending() {
    return this.quoteRepository.find({
      where: {
        status: 'pending',
      },
    });
  }

  async getAttachment(key: string) {
    try {
      // Vérifier si la clé est vide ou invalide
      if (!key || typeof key !== 'string') {
        Logger.error(`[QuoteService] Clé invalide: ${key}`);
        throw new Error('Clé de pièce jointe invalide');
      }

      const fileBuffer = await this.s3Service.getFile(key);

      return fileBuffer;
    } catch (error) {
      Logger.error(
        `[QuoteService] Erreur lors de la récupération de la pièce jointe: ${error.message}`,
      );
      if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
        throw new NotFoundException(`Pièce jointe non trouvée: ${key}`);
      }
      throw new NotFoundException(
        'Erreur lors de la récupération de la pièce jointe',
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendQuoteReminderEmails() {
    const quotes = await this.quoteRepository.find({
      where: {
        status: 'pending',
      },
      relations: ['client'],
    });
    Logger.log(
      `[QuoteService] Sending quote reminder emails for ${quotes.length} quotes`,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const quote of quotes) {
      if (!quote.validation_deadline) continue;

      const deadline = new Date(quote.validation_deadline);
      deadline.setHours(0, 0, 0, 0);

      // Calculer la différence en jours
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Envoyer le rappel uniquement si le devis expire demain
      if (diffDays === 1) {
        Logger.log(
          `[QuoteService] Sending quote reminder emails for quote ${quote.id}`,
        );
        // Envoyer un rappel au client si nécessaire
        if (quote.order_giver_acceptance === 'pending') {
          await this.mailService.sendQuoteReminderEmail(
            quote.client.email,
            quote.client.name,
            quote.id,
            'CLIENT',
            quote.client.email,
            this.formatDate(quote.quote_date),
            quote.comment,
            quote.price_htva,
            quote.client.name,
            this.formatDate(quote.validation_deadline),

            undefined,
            quote.attachment_url,
            quote.attachment_url?.map((url) => this.extractFileName(url)),
            quote.created_by_project_name,
          );
        }

        // Envoyer un rappel au projet si nécessaire
        if (quote.group_acceptance === 'pending' && quote.created_by_mail) {
          await this.mailService.sendQuoteReminderEmail(
            quote.created_by_mail,
            quote.created_by_project_name,
            quote.id,
            'GROUP',
            quote.created_by_mail,
            this.formatDate(quote.quote_date),
            quote.comment,
            quote.price_htva,
            quote.client.name,
            this.formatDate(quote.validation_deadline),

            undefined,
            quote.attachment_url,
            quote.attachment_url?.map((url) => this.extractFileName(url)),
            quote.created_by_project_name,
          );
        }
      }
    }
  }

  async findAllForAdmin(): Promise<Quote[]> {
    // Récupère tous les devis avec les relations nécessaires pour l'admin
    // Similaire à la méthode findAll de InvoiceService
    return this.quoteRepository
      .createQueryBuilder('quote')
      .select('quote')
      .leftJoin('quote.main_account', 'main_account')
      .addSelect(['main_account.id', 'main_account.username'])
      .leftJoin('quote.group_account', 'group_account')
      .addSelect(['group_account.id', 'group_account.username'])
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.products', 'products')
      .orderBy('quote.id', 'DESC') // Tri par ID décroissant par défaut
      .getMany();
  }

  async markClientInfoAsProvided(quoteId: number): Promise<Quote> {
    const quote = await this.findOne(quoteId);
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found.`);
    }
    if (!quote.client_info_required) {
      Logger.warn(
        `Attempting to mark client info as provided for quote ${quoteId}, but it was not required.`,
      );
      return quote; // Retourner le devis tel quel
    }

    quote.client_info_required = false;
    return this.quoteRepository.save(quote);
  }
}
