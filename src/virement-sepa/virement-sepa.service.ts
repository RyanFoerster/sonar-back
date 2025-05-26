import { S3Service } from '@/services/s3/s3.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { ComptePrincipal } from '../compte_principal/entities/compte_principal.entity';
import { UserSecondaryAccount } from '../user-secondary-account/entities/user-secondary-account.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateVirementSepaDto } from './dto/create-virement-sepa.dto';
import { VirementSepa } from './entities/virement-sepa.entity';
import { MailService } from '@/mail/mail.services';
import { PdfService } from '../services/pdf.service';
import { ConfigService } from '@nestjs/config';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';
import sharp from 'sharp';
import { UpdateVirementSepaDto } from '@/virement-sepa/dto/update-virement-sepa.dto';
import { isNumber } from 'class-validator';

const libreConvert = promisify(libre.convert);

@Injectable()
export class VirementSepaService {
  constructor(
    @InjectRepository(VirementSepa)
    private virementSepaRepository: Repository<VirementSepa>,
    private usersService: UsersService,
    private compteGroupService: CompteGroupeService,
    private comptePrincipalService: ComptePrincipalService,
    private s3Service: S3Service,
    private mailService: MailService,
    private pdfService: PdfService,
    private configService: ConfigService,
  ) {}

  async create(
    createVirementSepaDto: CreateVirementSepaDto,
    userId: number,
    params: any,
    invoice?: Express.Multer.File,
  ) {
    const user: User = await this.usersService.findOne(userId);
    let groupAccount: CompteGroupe | undefined = undefined;
    let principalAccount: ComptePrincipal | undefined = undefined;
    let accountFinded: UserSecondaryAccount | undefined;

    if (params.typeOfProjet === 'PRINCIPAL') {
      principalAccount = await this.comptePrincipalService.findOne(params.id);
      if (principalAccount.solde - createVirementSepaDto.amount_htva < 0) {
        throw new BadRequestException('Solde insuffisant');
      }
    }

    if (params.typeOfProjet === 'GROUP') {
      groupAccount = await this.compteGroupService.findOne(params.id);

      if (user.role !== 'ADMIN') {
        accountFinded = user.userSecondaryAccounts?.find(
          (account) => account.group_account.id === +params.id,
        );

        user.userSecondaryAccounts?.forEach((account) => {});

        if (!accountFinded) {
          Logger.error(
            `L'utilisateur ${user.id} n'a pas accès au compte groupe ${params.id}`,
          );
          throw new UnauthorizedException(
            "Vous n'avez pas accès à ce compte groupe",
          );
        }

        if (accountFinded.role_billing !== 'ADMIN') {
          throw new UnauthorizedException(
            "Vous n'avez pas les droits de facturation nécessaires pour effectuer cette opération",
          );
        }
      }

      if (groupAccount.solde - createVirementSepaDto.amount_htva < 0) {
        throw new BadRequestException('Solde insuffisant');
      }
    }

    if (!groupAccount && !principalAccount) {
      throw new BadRequestException('Aucun compte trouvé');
    }

    if (user.role !== 'ADMIN') {
      if (
        params.typeOfProjet === 'GROUP' &&
        accountFinded.role_billing !== 'ADMIN'
      ) {
        throw new BadRequestException(
          "Vous n'avez pas l'autorisation de faire cela",
        );
      }
    }

    const virementSepa: VirementSepa = this.virementSepaRepository.create(
      createVirementSepaDto,
    );

    if (principalAccount) {
      principalAccount.solde -= virementSepa.amount_htva;
      await this.comptePrincipalService.update(principalAccount);
      virementSepa.comptePrincipal = principalAccount;
      virementSepa.projet_username = principalAccount.username;
    }

    if (groupAccount) {
      groupAccount.solde -= +virementSepa.amount_htva;
      await this.compteGroupService.save(groupAccount);
      virementSepa.compteGroupe = groupAccount;
      virementSepa.projet_username = groupAccount.username;
    }

    if (invoice) {
      try {
        const key = await this.s3Service.uploadFile(
          invoice,
          `virement-sepa/${virementSepa.projet_username}`,
        );
        virementSepa.invoice_key = key;
        virementSepa.invoice_url = this.s3Service.getFileUrl(key);
      } catch (error) {
        Logger.error(error);
        throw new BadRequestException("Erreur lors de l'upload du fichier");
      }
    }

    return this.virementSepaRepository.save(virementSepa);
  }


  async createFromBank(
    createVirementSepaDto: CreateVirementSepaDto,
    userId: number,
    params: any,
  ) {
    let groupAccount: CompteGroupe | undefined = undefined;
    let principalAccount: ComptePrincipal | undefined = undefined;

    // Vérification du type de projet
    if (params.typeOfProjet === 'PRINCIPAL') {
      principalAccount = await this.comptePrincipalService.findOne(params.id);
    } else if (params.typeOfProjet === 'GROUP') {
      groupAccount = await this.compteGroupService.findOne(params.id);
    } else {
      throw new BadRequestException('Type de projet invalide');
    }

    // Vérification qu'au moins un compte a été trouvé
    if (!groupAccount && !principalAccount) {
      throw new BadRequestException('Aucun compte trouvé');
    }

    // Création du virement SEPA
    const virementSepa: VirementSepa = this.virementSepaRepository.create(
      createVirementSepaDto,
    );

    // Définir le statut initial en PENDING
    virementSepa.status = 'PENDING';

    if (principalAccount) {
      virementSepa.comptePrincipal = principalAccount;
      virementSepa.projet_username = principalAccount.username;
    }

    if (groupAccount) {
      virementSepa.compteGroupe = groupAccount;
      virementSepa.projet_username = groupAccount.username;
    }

    // Sauvegarde initiale du virement
    await this.virementSepaRepository.save(virementSepa);

    const montant = Number(virementSepa.amount_htva);

    // Mise à jour des soldes après la sauvegarde
    if (principalAccount) {
      principalAccount.solde += montant;
      await this.comptePrincipalService.update(principalAccount);
    }

    if (groupAccount) {
      groupAccount.solde += montant;
      await this.compteGroupService.save(groupAccount);
    }

    // Mise à jour du statut en PAID après modification des soldes
    virementSepa.status = 'PAID';
    return this.virementSepaRepository.save(virementSepa);
  }

  async findAll(userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('Vous ne pouvez pas faire cela');
    }

    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Vous ne pouvez pas faire cela');
    }

    return this.virementSepaRepository
      .createQueryBuilder('virement')
      .leftJoinAndSelect('virement.compteGroupe', 'compteGroupe')
      .leftJoinAndSelect('virement.comptePrincipal', 'comptePrincipal')
      .select(['virement', 'compteGroupe.id', 'comptePrincipal.id'])
      .getMany();
  }

  findOne(id: number) {
    return this.virementSepaRepository
      .createQueryBuilder('virement')
      .leftJoinAndSelect('virement.compteGroupe', 'compteGroupe')
      .leftJoinAndSelect('virement.comptePrincipal', 'comptePrincipal')
      .select(['virement', 'compteGroupe.id', 'comptePrincipal.id'])
      .where('virement.id = :id', { id })
      .getOneOrFail();
  }

  async update(
    id: number,
    status?: 'ACCEPTED' | 'REJECTED',
    body?: { rejected_reason: string },
  ) {
    let virement = await this.findOne(id);
    if (status) {
      virement.status = status;
    }

    if (virement.status === 'REJECTED') {
      if (virement.comptePrincipal !== null) {
        let account = await this.comptePrincipalService.findOne(
          virement.comptePrincipal.id,
        );
        account.solde += +virement.amount_htva;
        await this.comptePrincipalService.update(account);
      }

      if (virement.compteGroupe !== null) {
        let account = await this.compteGroupService.findOne(
          virement.compteGroupe.id,
        );
        account.solde += +virement.amount_htva;
        await this.compteGroupService.save(account);
      }

      if (body) {
        virement.rejected_reason = body.rejected_reason;
      }
    }

    return this.virementSepaRepository.save(virement);
  }

  async paid(id: number, userId: number) {
    let user = await this.usersService.findOne(userId);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Vous ne pouvez pas faire cela');
    }
    let virement = await this.findOne(id);
    if (virement.status === 'ACCEPTED') {
      virement.status = 'PAID';
    }
    return this.virementSepaRepository.save(virement);
  }

  remove(id: number) {
    return `This action removes a #${id} virementSepa`;
  }

  async initiateValidatedTransfers() {
    try {
      Logger.debug('Début de initiateValidatedTransfers');
      const validatedTransfers = await this.virementSepaRepository
        .createQueryBuilder('virement')
        .where('virement.status = :status', { status: 'ACCEPTED' })
        .getMany();

      Logger.debug(`Nombre de virements trouvés: ${validatedTransfers.length}`);

      const to = this.configService.get('isProd')
        ? 'achat-0700273583@soligere.clouddemat.be'
        : '';

      // const to = 'ryanfoerster@outlook.be';

      // const cc = this.configService.get('isProd')
      //   ? 'comptabilite@sonar.management'
      //   : '';

      const cc = '';

      for (const transfer of validatedTransfers) {
        try {
          Logger.debug(`Traitement du virement ${transfer.id}`);
          Logger.debug(`Clé du fichier: ${transfer.invoice_key}`);

          // Récupérer le PDF depuis S3
          const pdfContent = await this.s3Service.getFile(transfer.invoice_key);
          Logger.debug('PDF récupéré depuis S3');

          // Générer le PDF complet (récap + facture)
          const completePdf = await this.pdfService.generateVirementRecap(
            new Date(transfer.created_at).toLocaleDateString(),
            transfer.iban,
            transfer.amount_total,
            transfer.amount_htva,
            transfer.amount_tva,
            transfer.communication,
            transfer.structured_communication,
            transfer.projet_username,
            pdfContent,
            transfer.account_owner,
          );
          const base64Content = completePdf.toString('base64');
          Logger.debug('PDF complet généré');

          // Envoyer le mail avec le PDF complet
          Logger.debug(`Envoi du mail pour le virement ${transfer.id}`);
          Logger.debug(`Account owner: ${transfer.account_owner}`);
          Logger.debug(`Project name: ${transfer.projet_username}`);
          Logger.debug(`Amount: ${transfer.amount_total}`);

          await this.mailService.sendVirementSepaEmail(
            to,
            transfer.account_owner,
            base64Content,
            transfer.id,
            cc,
          );

          // Mettre à jour le statut en PAID
          transfer.status = 'PAID';
          await this.virementSepaRepository.save(transfer);

          Logger.log(
            `Mail envoyé et statut mis à jour pour le virement ${transfer.id}`,
          );
        } catch (error) {
          Logger.error(
            `Erreur lors de l'envoi du mail pour le virement ${transfer.id}:`,
            error,
          );
          throw error;
        }
      }

      return {
        success: true,
        message: `${validatedTransfers.length} virements traités`,
        processedTransfers: validatedTransfers.length,
      };
    } catch (error) {
      Logger.error("Erreur lors de l'initiation des virements:", error);
      throw new BadRequestException(
        `Erreur lors de l'initiation des virements SEPA: ${error.message}`,
      );
    }
  }

  async convertToPdf(file: Express.Multer.File): Promise<Buffer> {
    try {
      const mimeType = file.mimetype;
      let buffer = file.buffer;

      // Si c'est une image
      if (mimeType.startsWith('image/')) {
        // Créer un PDF à partir de l'image
        const image = sharp(buffer);
        const metadata = await image.metadata();

        // Redimensionner l'image si nécessaire tout en conservant les proportions
        const resizedImage = await image
          .resize(1240, undefined, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        // Convertir en PDF en utilisant PDFKit
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
        });

        // Collecter les chunks du PDF dans un buffer
        return new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);

          // Calculer les dimensions pour centrer l'image sur la page
          const pdfWidth = 595.28; // Largeur A4 en points
          const pdfHeight = 841.89; // Hauteur A4 en points
          const imageAspectRatio = metadata.width / metadata.height;
          let finalWidth = pdfWidth - 40; // Marge de 20 points de chaque côté
          let finalHeight = finalWidth / imageAspectRatio;

          // Ajuster si l'image est trop haute
          if (finalHeight > pdfHeight - 40) {
            finalHeight = pdfHeight - 40;
            finalWidth = finalHeight * imageAspectRatio;
          }

          // Centrer l'image sur la page
          const x = (pdfWidth - finalWidth) / 2;
          const y = (pdfHeight - finalHeight) / 2;

          // Ajouter l'image au PDF
          doc.image(resizedImage, x, y, {
            width: finalWidth,
            height: finalHeight,
          });

          doc.end();
        });
      }
      // Si c'est un document Office
      else if (
        mimeType.includes('officedocument') ||
        mimeType.includes('opendocument')
      ) {
        buffer = await libreConvert(buffer, '.pdf', undefined);
      }
      // Si le format n'est pas supporté
      else {
        throw new BadRequestException('Format de fichier non supporté');
      }

      return buffer;
    } catch (error) {
      Logger.error('Erreur lors de la conversion en PDF:', error);
      throw new BadRequestException('Erreur lors de la conversion en PDF');
    }
  }


  async updateVirement(id: number, dto: UpdateVirementSepaDto) {
    await this.virementSepaRepository.update(id, dto);
    return this.virementSepaRepository.findOneBy({ id });
  }

}
