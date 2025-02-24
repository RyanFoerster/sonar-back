import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Query,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectAttachmentService } from './user-attachment.service';
import { Response } from 'express';
import { JwtAuthGuard } from '@/guards/auth.guard';

@Controller('project-attachments')
@UseGuards(JwtAuthGuard)
export class ProjectAttachmentController {
  constructor(
    private readonly projectAttachmentService: ProjectAttachmentService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('projectType') projectType: 'principal' | 'groupe',
    @Body('projectId') projectId: string,
    @Body('description') description?: string,
  ) {
    return this.projectAttachmentService.create(
      file,
      projectType,
      parseInt(projectId),
      description,
    );
  }

  @Get()
  async getProjectAttachments(
    @Query('projectType') projectType: 'principal' | 'groupe',
    @Query('projectId') projectId: string,
  ) {
    return this.projectAttachmentService.findAllByProject(
      projectType,
      parseInt(projectId),
    );
  }

  @Get(':id/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Query('projectType') projectType: 'principal' | 'groupe',
    @Query('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.projectAttachmentService.findOne(
      +id,
      projectType,
      parseInt(projectId),
    );
    if (!attachment) {
      return res.status(404).send('Pièce jointe non trouvée');
    }

    const fileBuffer = await this.projectAttachmentService.getFileBuffer(
      attachment.key,
    );

    res.setHeader('Content-Type', attachment.type);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${attachment.name}"`,
    );
    return res.send(fileBuffer);
  }

  @Delete(':id')
  async deleteAttachment(
    @Param('id') id: string,
    @Query('projectType') projectType: 'principal' | 'groupe',
    @Query('projectId') projectId: string,
  ) {
    return this.projectAttachmentService.delete(
      +id,
      projectType,
      parseInt(projectId),
    );
  }
}
