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
  Request,
  MaxFileSizeValidator,
  ParseFilePipe,
  FileTypeValidator,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserAttachmentService } from './user-attachment.service';
import { Response } from 'express';
import { JwtAuthGuard } from '@/guards/auth.guard';

@Controller('user-attachments')
@UseGuards(JwtAuthGuard)
export class UserAttachmentController {
  constructor(private readonly userAttachmentService: UserAttachmentService) {}

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
    @Body('description') description: string,
    @Request() req: any,
  ) {
    return this.userAttachmentService.create(file, req.user.id, description);
  }

  @Get()
  async getUserAttachments(@Request() req: any) {
    return this.userAttachmentService.findAllByUser(req.user.id);
  }

  @Get(':id/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const attachment = await this.userAttachmentService.findOne(
      +id,
      req.user.id,
    );
    if (!attachment) {
      return res.status(404).send('Pièce jointe non trouvée');
    }

    const fileBuffer = await this.userAttachmentService.getFileBuffer(
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
  async deleteAttachment(@Param('id') id: string, @Request() req: any) {
    return this.userAttachmentService.delete(+id, req.user.id);
  }
}
