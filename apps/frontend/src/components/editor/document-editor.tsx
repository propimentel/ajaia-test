import { useCallback, useState } from 'react';
import {
  Plate,
  usePlateEditor,
  PlateContent,
  type PlateEditor,
} from 'platejs/react';
import type { Descendant, Value } from 'platejs';
import {
  MarkdownPlugin,
  remarkMdx,
  remarkMention,
} from '@platejs/markdown';
import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react';
import { ListPlugin } from '@platejs/list/react';

import { FixedToolbar } from './ui/fixed-toolbar';
import { MarkdownPreview } from './ui/markdown-preview';

// Plate API is unstable across majors. This file targets v53 of platejs +
// @platejs/basic-nodes + @platejs/list + @platejs/markdown. Do not bump those
// packages without re-running the frontend test suite and re-verifying the
// toolbar.

export interface DocumentEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
}

const EMPTY_DOC: Value = [{ type: 'p', children: [{ text: '' }] }];

interface MarkdownApi {
  deserialize: (md: string) => Value;
  serialize: () => string;
}

function getMarkdownApi(editor: PlateEditor | null | undefined): MarkdownApi | null {
  if (!editor) return null;
  const api = (editor as unknown as { api?: { markdown?: MarkdownApi } }).api;
  return api?.markdown ?? null;
}

function deserialize(editor: PlateEditor | null, markdown: string): Value {
  if (!markdown.trim()) return EMPTY_DOC;
  const api = getMarkdownApi(editor);
  if (!api) return EMPTY_DOC;
  try {
    const parsed = api.deserialize(markdown);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

export function DocumentEditor({
  initialContent,
  onChange,
  readOnly = false,
}: DocumentEditorProps) {
  const editor = usePlateEditor<Value>(
    {
      // v53 plugin types don't unify under a single PluginConfig; cast to keep
      // the call site readable. Runtime behavior is unchanged.
      plugins: [
        BasicBlocksPlugin,
        BasicMarksPlugin,
        ListPlugin,
        MarkdownPlugin.configure({
          options: {
            remarkPlugins: [remarkMdx, remarkMention],
          },
        }),
      ] as never,
      value: (e) => deserialize(e, initialContent),
    },
    [],
  );

  const [liveMarkdown, setLiveMarkdown] = useState<string>(initialContent);

  const handleChange = useCallback(() => {
    const api = getMarkdownApi(editor);
    if (!api) return;
    try {
      const md = api.serialize();
      setLiveMarkdown(md);
      onChange(md);
    } catch {
      // ignore serialize errors during transient states
    }
  }, [editor, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <Plate editor={editor} onChange={handleChange}>
        {!readOnly && <FixedToolbar />}
        <div className="relative w-full cursor-text rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <PlateContent
            className="outline-none px-3 py-2 min-h-[160px]"
            placeholder="Start writing…"
          />
        </div>
      </Plate>
      <MarkdownPreview markdown={liveMarkdown} />
    </div>
  );
}

export type { Descendant };
