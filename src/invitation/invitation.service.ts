import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { Invitation } from './entities/invitation.entity';
import { Event } from '../event/entities/event.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationsRepository: Repository<Invitation>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createInvitationDto: CreateInvitationDto): Promise<Invitation> {
    const event = await this.eventsRepository.findOneBy({
      id: createInvitationDto.eventId,
    });
    if (!event) {
      throw new NotFoundException(
        `Event #${createInvitationDto.eventId} not found`,
      );
    }

    const user = await this.usersRepository.findOneBy({
      id: createInvitationDto.userId,
    });
    if (!user) {
      throw new NotFoundException(
        `User #${createInvitationDto.userId} not found`,
      );
    }

    const invitation = this.invitationsRepository.create({
      ...createInvitationDto,
      status: 'invited',
      event,
      user,
    });
    return await this.invitationsRepository.save(invitation);
  }

  async findAll(): Promise<Invitation[]> {
    return await this.invitationsRepository.find({
      relations: ['event', 'user'],
    });
  }

  async findOne(id: number): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation #${id} not found`);
    }
    return invitation;
  }

  async update(
    id: number,
    updateInvitationDto: UpdateInvitationDto,
  ): Promise<Invitation> {
    const invitation = await this.invitationsRepository.preload({
      id,
      ...updateInvitationDto,
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation #${id} not found`);
    }

    const event = await this.eventsRepository.findOneBy({
      id: invitation.event.id,
    });
    if (!event) {
      throw new NotFoundException(`Event #${invitation.event.id} not found`);
    }

    if (!event.participants) {
      event.participants = [];
    }

    event.participants.push(invitation.user);
    event.user_status.push({ user_id: invitation.user.id, status: 'accepted' });
    await this.invitationsRepository.save(invitation);
    await this.eventsRepository.save(event);
    return await this.invitationsRepository.save(invitation);
  }

  async remove(id: number): Promise<void> {
    const invitation = await this.findOne(id);
    await this.invitationsRepository.remove(invitation);
  }

  async findByUserId(userId: number) {
    return await this.invitationsRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.user', 'user')
      .leftJoinAndSelect('invitation.event', 'event')
      .select([
        'invitation.id',
        'invitation.status',
        'invitation.eventId',
        'event.id',
        'event.title',
        'event.start_time',
        'event.end_time',
        'user.id',
        'user.firstName',
        'user.name',
      ])
      .where('user.id = :id', { id: userId })
      .andWhere('invitation.status = :status', { status: 'invited' }) // Correction ici
      .getMany();
  }
}
