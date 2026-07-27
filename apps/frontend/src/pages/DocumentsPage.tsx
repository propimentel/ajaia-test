import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FilePlus, MoreVertical, Trash2 } from 'lucide-react';
import type { DocumentMeta } from '@ajaia/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDocs(await api.list());
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load documents';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const doc = await api.create({});
      toast.success('Document created');
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create document';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.remove(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete document';
      toast.error(msg);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Documents</CardTitle>
          <Button onClick={handleCreate} disabled={creating} size="sm">
            <FilePlus className="mr-2" />
            New document
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="flex-1 truncate font-medium hover:underline"
                  >
                    {doc.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {new Date(doc.updatedAt).toLocaleString()}
                    </span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Document actions">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => void handleDelete(doc.id)}
                      >
                        <Trash2 className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
