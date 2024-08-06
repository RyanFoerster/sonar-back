// src/comments/comments.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommentsService } from './comment.service'; 
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentsService.create(createCommentDto);
  }

  @Get()
  findAll(): Promise<Comment[]> {
    return this.commentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Comment> {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateCommentDto: UpdateCommentDto): Promise<Comment> {
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<void> {
    return this.commentsService.remove(id);
  }
}
