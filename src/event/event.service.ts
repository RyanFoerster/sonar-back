import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { User } from '../users/entities/user.entity';
import { Invitation } from '../invitation/entities/invitation.entity';
import { CreateInvitationDto } from '../invitation/dto/create-invitation.dto';
import { InvitationsService } from '../invitation/invitation.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private dataSource: DataSource,
    private invitationsService: InvitationsService,
  ) {
  }

  async create(createEventDto: CreateEventDto, params: any, user_id: number): Promise<Event> {
    Logger.debug(JSON.stringify(createEventDto, null, 2));
    const eventInDB: Event = await this.eventsRepository.findOneBy({ title: createEventDto.title });
    if (eventInDB) {
      throw new BadRequestException('Event already exists');
    }
    const event = await this.eventsRepository.save(createEventDto);
    if (event.participants === undefined) {
      event.participants = [];
    }

    if (event.organisateurs === undefined) {
      event.organisateurs = [];
    }

    const groupAccount = await this.dataSource.createQueryBuilder(CompteGroupe, 'compteGroupe')
      .select([
        'compteGroupe.id',
        'compteGroupe.username',
        'compteGroupe.solde',
      ])
      .where('compteGroupe.id = :id', { id: params.group_id })
      .getOne();

    if (!groupAccount) {
      throw new BadRequestException('Group not found');
    }
    event.group = groupAccount;

    const organisateurs = await this.dataSource.createQueryBuilder(User, 'user').select([
      'user.id',
      'user.name',
      'user.email', // Ajoute ici les autres champs que tu veux inclure
    ])
      .where('user.id IN (:...ids)', { ids: createEventDto.organisateurs_ids }) // Remplace `userId` par l'identifiant de l'utilisateur
      .getMany();
    if (!organisateurs) {
      throw new BadRequestException('Organisateurs not found');
    }

    Logger.debug(JSON.stringify(organisateurs, null, 2));

    event.organisateurs = organisateurs;

    for(const organisateur of organisateurs) {
      const userStatut: {user_id: number, status: "accepted" | "refused"} = {user_id: organisateur.id, status: "refused"}
      event.user_status.push(userStatut)
    }

    let invitations: Invitation[] = [];
    for (const user_id of createEventDto.invitations_ids) {
      let createInvitationDto: CreateInvitationDto;
      Logger.debug(event.id);
      createInvitationDto = {
        eventId: event.id,
        userId: user_id,
      };

      let invitationCreated = await this.invitationsService.create(createInvitationDto);
      invitations.push(invitationCreated);
    }

    event.invitation = invitations;
    Logger.debug(JSON.stringify(event, null, 2));

    return await this.eventsRepository.save(event);

  }

  async findAll(): Promise<Event[]> {
    return await this.eventsRepository.find();
  }

  async findAllByGroupId(group_id: number): Promise<Event[]> {
    return await this.eventsRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.participants', 'participants')
      .leftJoinAndSelect('event.organisateurs', 'organisateurs')
      .leftJoinAndSelect('event.comments', 'comment')
      .leftJoinAndSelect('event.invitation', 'invitation')
      .leftJoinAndSelect('invitation.user', 'user')
      .leftJoinAndSelect('comment.user', 'comment_user')
      .leftJoinAndSelect('event.group', 'group')
      .select([
        'event.id',
        'event.title',
        'event.description',
        'event.location',
        'event.start_time',
        'event.end_time',
        'event.rendez_vous_date',
        'event.group',
        'event.status',
        'event.reason',
        'event.user_status',
        'participants.id',
        'participants.name',
        'participants.firstName',
        'participants.email',
        'organisateurs.id',
        'organisateurs.name',
        'organisateurs.firstName',
        'organisateurs.email',
        'invitation.id',
        'invitation.status',
        'user.id',
        'user.name',
        'user.firstName',
        'user.email',
        'comment.id',
        'comment.content',
        'comment.created_at',
        'comment_user.id',
        'comment_user.name',
        'comment_user.firstName',
        'comment_user.email',
        'comment_user.profilePicture',
        'group.id',
        'group.username',
      ])
      .where('group.id = :id', { id: group_id })
      .getMany();
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.participants', 'participants')
      .leftJoinAndSelect('event.organisateurs', 'organisateurs')
      .leftJoinAndSelect('event.comments', 'comment')
      .leftJoinAndSelect('event.invitation', 'invitation')
      .leftJoinAndSelect('invitation.user', 'user')
      .leftJoinAndSelect('comment.user', 'comment_user')
      .select([
        'event.id',
        'event.title',
        'event.description',
        'event.location',
        'event.start_time',
        'event.end_time',
        'event.group',
        'event.status',
        'event.reason',
        'event.user_status',
        'participants.id',
        'participants.name',
        'participants.firstName',
        'participants.email',
        'organisateurs.id',
        'organisateurs.name',
        'organisateurs.firstName',
        'organisateurs.email',
        'invitation.id',
        'invitation.status',
        'user.id',
        'user.name',
        'user.firstName',
        'user.email',
        'comment.id',
        'comment.content',
        'comment.created_at',
      ])
      .where('event.id = :id', { id })
      .getOne();
    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    let event = await this.eventsRepository.findOneBy({ id: id });
    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }

    event = {
      ...event,
      ...updateEventDto,
    };

    await this.eventsRepository.save(event);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }

  async confirm(event_id: number) {
    const event = await this.findOne(event_id);

    if (!event) {
      throw new NotFoundException(`Event #${event_id} not found`);
    }

    if (event.reason !== null) {
      event.reason = null;
    }
    event.status = 'confirmed';
    return await this.eventsRepository.save(event);
  }

  async cancel(event_id: number, reason: string) {
    const event = await this.findOne(event_id);

    if (!event) {
      throw new NotFoundException(`Event #${event_id} not found`);
    }

    event.reason = reason;
    event.status = 'canceled';
    return await this.eventsRepository.save(event);
  }

  async hide(event_id: number, reason: string) {
    const event = await this.findOne(event_id);

    if (!event) {
      throw new NotFoundException(`Event #${event_id} not found`);
    }

    event.reason = reason;
    event.status = 'hidden';
    return await this.eventsRepository.save(event);
  }

  async userStatus(event_id: number, user_id: number, status: 'accepted' | 'refused') {
    const event = await this.findOne(event_id);

    if (!event) {
      throw new NotFoundException(`Event #${event_id} not found`);
    }

    if (event.user_status === undefined || event.user_status === null) {
      event.user_status = [];
    }

    Logger.debug(event.user_status);

    if (event.user_status.find(user => user.user_id === user_id) === undefined) {
      event.user_status.push({ user_id, status });
    } else {
      event.user_status = event.user_status.map(user => {
        if (user.user_id === user_id) {
          user.status = status;
        }
        return user;
      });
    }

    return await this.eventsRepository.save(event);
  }
}