import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventsRepository.create(createEventDto);
    return await this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return await this.eventsRepository.find();
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.eventsRepository.preload({
      id,
      ...updateEventDto,
    });
    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    return await this.eventsRepository.save(event);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }
}