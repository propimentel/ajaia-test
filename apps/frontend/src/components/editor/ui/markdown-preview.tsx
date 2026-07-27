'use client';

import { cn } from '@/lib/utils';

export interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  if (!markdown) return null;
  return (
    <details className={cn('rounded-md border bg-muted/40 p-2 text-xs', className)}>
      <summary className="cursor-pointer select-none font-medium text-muted-foreground">
        Markdown preview
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">
        {markdown}
      </pre>
    </details>
  );
}
