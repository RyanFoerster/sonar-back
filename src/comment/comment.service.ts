// src/comments/comments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { Event } from 'src/event/entities/event.entity'; 
import { User } from '../users/entities/user.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const event = await this.eventsRepository.findOneBy({ id: createCommentDto.eventId });
    if (!event) {
      throw new NotFoundException(`Event #${createCommentDto.eventId} not found`);
    }

    const user = await this.usersRepository.findOneBy({ id: createCommentDto.userId });
    if (!user) {
      throw new NotFoundException(`User #${createCommentDto.userId} not found`);
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      event,
      user,
    });
    return await this.commentsRepository.save(comment);
  }

  async findAll(): Promise<Comment[]> {
    return await this.commentsRepository.find({ relations: ['event', 'user'] });
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({ where: { id }, relations: ['event', 'user'] });
    if (!comment) {
      throw new NotFoundException(`Comment #${id} not found`);
    }
    return comment;
  }

  async update(id: number, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.commentsRepository.preload({
      id,
      ...updateCommentDto,
    });
    if (!comment) {
      throw new NotFoundException(`Comment #${id} not found`);
    }
    return await this.commentsRepository.save(comment);
  }

  async remove(id: number): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentsRepository.remove(comment);
  }
}
