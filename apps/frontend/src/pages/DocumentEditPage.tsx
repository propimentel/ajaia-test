import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import type { DocumentDto } from '@ajaia/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { DocumentEditor } from '@/components/editor/document-editor';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSaved = useRef<{ title: string; content: string } | null>(null);

  const debouncedTitle = useDebouncedValue(title, 1500);
  const debouncedContent = useDebouncedValue(content, 1500);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const fetched = await api.get(id);
        if (cancelled) return;
        setDoc(fetched);
        setTitle(fetched.title);
        setContent(fetched.content);
        lastSaved.current = { title: fetched.title, content: fetched.content };
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : 'Failed to load document';
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = useCallback(
    async (next: { title?: string; content?: string }) => {
      if (!id) return;
      setSaveState('saving');
      try {
        const updated = await api.update(id, next);
        setDoc(updated);
        lastSaved.current = { title: updated.title, content: updated.content };
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        const msg = err instanceof ApiError ? err.message : 'Autosave failed';
        toast.error(msg);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!lastSaved.current) return;
    const next: { title?: string; content?: string } = {};
    if (debouncedTitle !== lastSaved.current.title) next.title = debouncedTitle;
    if (debouncedContent !== lastSaved.current.content) next.content = debouncedContent;
    if (Object.keys(next).length > 0) {
      void persist(next);
    }
  }, [debouncedTitle, debouncedContent, persist]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <p className="text-sm text-muted-foreground">Loading document…</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <p className="text-sm text-muted-foreground">
          Document not found. <Link to="/documents" className="underline">Back to list</Link>
        </p>
      </div>
    );
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'All changes saved'
        : saveState === 'error'
          ? 'Autosave failed'
          : '';

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/documents">
            <ArrowLeft className="mr-2" />
            Back
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {saveLabel}
        </span>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="mb-2 h-auto border-none px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
        aria-label="Document title"
      />
      <Separator className="mb-4" />

      <DocumentEditor
        key={doc.id}
        initialContent={doc.content}
        onChange={(md) => setContent(md)}
      />
    </div>
  );
}
