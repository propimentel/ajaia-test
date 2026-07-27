import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document as PrismaDocument } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDocumentDto, DocumentDto, DocumentMeta, UpdateDocumentDto } from '@ajaia/shared';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<DocumentMeta[]> {
    const docs = await this.prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
    return docs.map((d) => this.toMeta(d));
  }

  async findOne(id: string): Promise<DocumentDto> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return this.toDto(doc);
  }

  async create(input: CreateDocumentDto): Promise<DocumentDto> {
    const doc = await this.prisma.document.create({
      data: {
        title: input.title ?? 'Untitled',
        content: input.content ?? '',
      },
    });
    return this.toDto(doc);
  }

  async update(id: string, input: UpdateDocumentDto): Promise<DocumentDto> {
    try {
      const doc = await this.prisma.document.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
        },
      });
      return this.toDto(doc);
    } catch (err) {
      if (this.isPrismaNotFound(err)) {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.document.delete({ where: { id } });
    } catch (err) {
      if (this.isPrismaNotFound(err)) {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw err;
    }
  }

  private toMeta(d: Pick<PrismaDocument, 'id' | 'title' | 'updatedAt'>): DocumentMeta {
    return { id: d.id, title: d.title, updatedAt: d.updatedAt.toISOString() };
  }

  private toDto(d: PrismaDocument): DocumentDto {
    return {
      id: d.id,
      title: d.title,
      content: d.content,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  private isPrismaNotFound(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === 'P2025'
    );
  }
}
