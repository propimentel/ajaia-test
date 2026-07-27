import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document as PrismaDocument } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateDocumentDto,
  DocumentDto,
  DocumentMeta,
  UpdateDocumentDto,
} from '@ajaia/shared';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<DocumentMeta[]> {
    const docs = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
    return docs.map((d) => this.toMeta(d));
  }

  async findOne(userId: string, id: string): Promise<DocumentDto> {
    const doc = await this.prisma.document.findFirst({ where: { id, userId } });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return this.toDto(doc);
  }

  async create(userId: string, input: CreateDocumentDto): Promise<DocumentDto> {
    const doc = await this.prisma.document.create({
      data: {
        userId,
        title: input.title ?? 'Untitled',
        content: input.content ?? '',
      },
    });
    return this.toDto(doc);
  }

  async update(userId: string, id: string, input: UpdateDocumentDto): Promise<DocumentDto> {
    try {
      const doc = await this.prisma.document.update({
        where: { id, userId },
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

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.document.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException(`Document ${id} not found`);
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
