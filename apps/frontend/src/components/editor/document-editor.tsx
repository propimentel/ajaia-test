import { useCallback, useMemo, useState } from 'react';
import { Plate, usePlateEditor, type Descendant } from 'platejs/react';
import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { BasicMarksPlugin } from '@platejs/basic-nodes/react';
import { HeadingPlugin } from '@platejs/heading/react';
import { ListPlugin } from '@platejs/list-classic/react';

import { Editor, EditorContainer } from './ui/editor';
import { FixedToolbar } from './ui/fixed-toolbar';
import { MarkdownPreview } from './ui/markdown-preview';

// Plate API is unstable across majors. The hooks, `editor.api.markdown.*`
// helpers, and `editor.tf.*` transforms below are written for v32. Do not bump
// `platejs` or `@platejs/*` without re-running the frontend test suite and
// re-verifying the toolbar.

export interface DocumentEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
}

const EMPTY_DOC: Descendant[] = [{ type: 'p', children: [{ text: '' }] }];

function deserialize(
  editor: ReturnType<typeof usePlateEditor>,
  markdown: string,
): Descendant[] {
  if (!markdown.trim()) return EMPTY_DOC;
  try {
    const parsed = editor.api.markdown.deserialize(markdown) as Descendant[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

export function DocumentEditor({ initialContent, onChange, readOnly = false }: DocumentEditorProps) {
  const editor = usePlateEditor(
    {
      plugins: [
        BasicMarksPlugin,
        HeadingPlugin,
        ListPlugin,
        MarkdownPlugin.configure({
          options: {
            remarkPlugins: [remarkMdx, remarkMention],
          },
        }),
      ],
    },
    [],
  );

  const initialValue = useMemo(() => deserialize(editor, initialContent), [editor]);

  const [liveMarkdown, setLiveMarkdown] = useState<string>(initialContent);

  const handleChange = useCallback(() => {
    try {
      const md = editor.api.markdown.serialize();
      setLiveMarkdown(md);
      onChange(md);
    } catch {
      // ignore serialize errors during transient states
    }
  }, [editor, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <Plate editor={editor} initialValue={initialValue} onChange={handleChange}>
        {!readOnly && <FixedToolbar />}
        <EditorContainer>
          <Editor
            className="plate-editor"
            readOnly={readOnly}
            placeholder="Start writing…"
            autoFocus
          />
        </EditorContainer>
      </Plate>
      <MarkdownPreview markdown={liveMarkdown} />
    </div>
  );
}
