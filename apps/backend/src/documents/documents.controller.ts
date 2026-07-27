import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  CreateDocumentDto,
  DocumentDto,
  DocumentMeta,
  UpdateDocumentDto,
} from '@ajaia/shared';
import { DocumentsService } from './documents.service';
import { CurrentUserId } from './current-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<DocumentMeta[]> {
    return this.documents.list(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DocumentDto> {
    return this.documents.findOne(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() userId: string, @Body() body: CreateDocumentDto): Promise<DocumentDto> {
    return this.documents.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDocumentDto,
  ): Promise<DocumentDto> {
    return this.documents.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.documents.remove(userId, id);
  }
}
