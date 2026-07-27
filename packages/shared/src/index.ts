export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DocumentDto extends DocumentMeta {
  content: string;
  createdAt: string;
}

export interface CreateDocumentDto {
  title?: string;
  content?: string;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
}

export const USER_ID_HEADER = 'X-User-Id';
