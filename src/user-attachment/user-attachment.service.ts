import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAttachmentEntity } from './entities/user-attachment.entity';
import { S3Service } from '../services/s3/s3.service';

@Injectable()
export class UserAttachmentService {
  constructor(
    @InjectRepository(UserAttachmentEntity)
    private readonly userAttachmentRepository: Repository<UserAttachmentEntity>,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    file: Express.Multer.File,
    userId: number,
    description?: string,
  ): Promise<UserAttachmentEntity> {
    const key = await this.s3Service.uploadFile(
      file,
      `user-${userId}/attachments`,
    );
    const url = this.s3Service.getFileUrl(key);

    const attachment = this.userAttachmentRepository.create({
      name: file.originalname,
      key,
      url,
      type: file.mimetype,
      description,
      user: { id: userId },
    });

    return this.userAttachmentRepository.save(attachment);
  }

  async findAllByUser(userId: number): Promise<UserAttachmentEntity[]> {
    return this.userAttachmentRepository.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(
    id: number,
    userId: number,
  ): Promise<UserAttachmentEntity | null> {
    return this.userAttachmentRepository.findOne({
      where: { id, user: { id: userId } },
    });
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    return this.s3Service.getFile(key);
  }

  async delete(id: number, userId: number): Promise<void> {
    const attachment = await this.userAttachmentRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (attachment) {
      await this.s3Service.deleteFile(attachment.key);
      await this.userAttachmentRepository.remove(attachment);
    }
  }
}
