import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { Invitation } from './entities/invitation.entity';
import { Event } from 'src/event/entities/event.entity';
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
    const event = await this.eventsRepository.findOneBy({ id: createInvitationDto.eventId });
    if (!event) {
      throw new NotFoundException(`Event #${createInvitationDto.eventId} not found`);
    }

    const user = await this.usersRepository.findOneBy({ id: createInvitationDto.userId });
    if (!user) {
      throw new NotFoundException(`User #${createInvitationDto.userId} not found`);
    }

    const invitation = this.invitationsRepository.create({
      ...createInvitationDto,
      status: createInvitationDto.status || 'invited',
      event,
      user,
    });
    return await this.invitationsRepository.save(invitation);
  }

  async findAll(): Promise<Invitation[]> {
    return await this.invitationsRepository.find({ relations: ['event', 'user'] });
  }

  async findOne(id: number): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({ where: { id }, relations: ['event', 'user'] });
    if (!invitation) {
      throw new NotFoundException(`Invitation #${id} not found`);
    }
    return invitation;
  }

  async update(id: number, updateInvitationDto: UpdateInvitationDto): Promise<Invitation> {
    const invitation = await this.invitationsRepository.preload({
      id,
      ...updateInvitationDto,
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation #${id} not found`);
    }
    return await this.invitationsRepository.save(invitation);
  }

  async remove(id: number): Promise<void> {
    const invitation = await this.findOne(id);
    await this.invitationsRepository.remove(invitation);
  }
}
