import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAttachmentEntity } from './entities/user-attachment.entity';
import { S3Service } from '../services/s3/s3.service';

@Injectable()
export class ProjectAttachmentService {
  constructor(
    @InjectRepository(ProjectAttachmentEntity)
    private readonly projectAttachmentRepository: Repository<ProjectAttachmentEntity>,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    file: Express.Multer.File,
    projectType: 'principal' | 'groupe',
    projectId: number,
    description?: string,
  ): Promise<ProjectAttachmentEntity> {
    const key = await this.s3Service.uploadFile(
      file,
      `${projectType}-${projectId}/attachments`,
    );
    const url = this.s3Service.getFileUrl(key);

    const attachment = this.projectAttachmentRepository.create({
      name: file.originalname,
      key,
      url,
      type: file.mimetype,
      description,
      ...(projectType === 'principal'
        ? { comptePrincipal: { id: projectId } }
        : { compteGroupe: { id: projectId } }),
    });

    return this.projectAttachmentRepository.save(attachment);
  }

  async findAllByProject(
    projectType: 'principal' | 'groupe',
    projectId: number,
  ): Promise<ProjectAttachmentEntity[]> {
    return this.projectAttachmentRepository.find({
      where:
        projectType === 'principal'
          ? { comptePrincipal: { id: projectId } }
          : { compteGroupe: { id: projectId } },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(
    id: number,
    projectType: 'principal' | 'groupe',
    projectId: number,
  ): Promise<ProjectAttachmentEntity | null> {
    return this.projectAttachmentRepository.findOne({
      where:
        projectType === 'principal'
          ? { id, comptePrincipal: { id: projectId } }
          : { id, compteGroupe: { id: projectId } },
    });
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    return this.s3Service.getFile(key);
  }

  async delete(
    id: number,
    projectType: 'principal' | 'groupe',
    projectId: number,
  ): Promise<void> {
    const attachment = await this.projectAttachmentRepository.findOne({
      where:
        projectType === 'principal'
          ? { id, comptePrincipal: { id: projectId } }
          : { id, compteGroupe: { id: projectId } },
    });

    if (attachment) {
      await this.s3Service.deleteFile(attachment.key);
      await this.projectAttachmentRepository.remove(attachment);
    }
  }
}
