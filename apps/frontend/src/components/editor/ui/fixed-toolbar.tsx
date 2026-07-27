'use client';

import * as React from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
} from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from '@/components/ui/toolbar';
import { cn } from '@/lib/utils';

interface MarkButtonProps {
  tooltip: string;
  mark: 'bold' | 'italic' | 'underline';
  children: React.ReactNode;
}

function MarkButton({ tooltip, mark, children }: MarkButtonProps) {
  const editor = useEditorRef();
  const isActive = editor.api.isMarkActive(mark);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.tf[mark].toggle();
  };

  // NOTE: editor.api.isMarkActive / editor.tf.<mark>.toggle() are written for
  // Plate v32. If a different major is resolved by pnpm, these calls will
  // fail typecheck (or throw at runtime). Do not bump plate without
  // re-verifying this file.

  return (
    <ToolbarButton
      onMouseDown={onMouseDown}
      data-state={isActive ? 'on' : 'off'}
      className={cn(isActive && 'bg-accent text-accent-foreground')}
      title={tooltip}
      type="button"
    >
      {children}
    </ToolbarButton>
  );
}

function BlockButton({
  tooltip,
  blockType,
  children,
}: {
  tooltip: string;
  blockType: 'h1' | 'h2' | 'ul' | 'ol';
  children: React.ReactNode;
}) {
  const editor = useEditorRef();
  const isActive = editor.api.isBlockActive(blockType);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (blockType === 'h1' || blockType === 'h2') {
      const level = Number.parseInt(blockType.slice(1), 10);
      editor.tf.heading.toggle({ level });
    } else {
      // listType: 'ul' | 'ol' — verify signature against @platejs/list-classic v32
      editor.tf.list.toggle({ listType: blockType });
    }
  };

  return (
    <ToolbarButton
      onMouseDown={onMouseDown}
      data-state={isActive ? 'on' : 'off'}
      className={cn(isActive && 'bg-accent text-accent-foreground')}
      title={tooltip}
      type="button"
    >
      {children}
    </ToolbarButton>
  );
}

export function FixedToolbar() {
  return (
    <Toolbar className="mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur">
      <MarkButton tooltip="Bold (⌘B)" mark="bold">
        <BoldIcon />
      </MarkButton>
      <MarkButton tooltip="Italic (⌘I)" mark="italic">
        <ItalicIcon />
      </MarkButton>
      <MarkButton tooltip="Underline (⌘U)" mark="underline">
        <UnderlineIcon />
      </MarkButton>
      <ToolbarSeparator />
      <BlockButton tooltip="Heading 1" blockType="h1">
        <Heading1Icon />
      </BlockButton>
      <BlockButton tooltip="Heading 2" blockType="h2">
        <Heading2Icon />
      </BlockButton>
      <ToolbarSeparator />
      <BlockButton tooltip="Bullet list" blockType="ul">
        <ListIcon />
      </BlockButton>
      <BlockButton tooltip="Numbered list" blockType="ol">
        <ListOrderedIcon />
      </BlockButton>
    </Toolbar>
  );
}
