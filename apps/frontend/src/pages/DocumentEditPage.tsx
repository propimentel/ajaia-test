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

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1500;

export function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSaved = useRef<{ title: string; content: string } | null>(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  titleRef.current = title;
  contentRef.current = content;

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
        if (!lastSaved.current) return;
        lastSaved.current = { title: updated.title, content: updated.content };
        setDoc(updated);
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        const msg = err instanceof ApiError ? err.message : 'Autosave failed';
        toast.error(msg);
      }
    },
    [id],
  );

  // Single shared debounce: any change to title or content resets the timer.
  // After AUTOSAVE_DELAY_MS of no changes, we PATCH only the fields that
  // actually differ from the last saved snapshot. This is what makes the save
  // stable on initial load: the title and content debounces fire together at
  // the same instant, so the autosave effect never sees a transient
  // (debouncedContent === '' while lastSaved.content === '# Real Test...').
  useEffect(() => {
    if (!lastSaved.current) return;
    const last = lastSaved.current;
    const handle = setTimeout(() => {
      const next: { title?: string; content?: string } = {};
      if (title !== last.title) next.title = title;
      if (content !== last.content) next.content = content;
      if (Object.keys(next).length > 0) {
        void persist(next);
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(handle);
  }, [title, content, persist]);

  // Flush pending changes when the route unmounts. Without this, a user that
  // types and clicks "Back" inside the debounce window loses the edit (and
  // worse, used to wipe the saved content to '').
  useEffect(() => {
    return () => {
      const last = lastSaved.current;
      if (!last || !id) return;
      const next: { title?: string; content?: string } = {};
      if (titleRef.current !== last.title) next.title = titleRef.current;
      if (contentRef.current !== last.content) next.content = contentRef.current;
      if (Object.keys(next).length > 0) {
        void api.update(id, next).catch(() => {
          // swallow on unmount; user already navigated away
        });
      }
    };
  }, [id]);

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
        name="title"
        placeholder="Untitled"
        className="mb-2 h-auto border-none px-0 py-2 text-3xl font-bold shadow-none focus-visible:ring-0"
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
