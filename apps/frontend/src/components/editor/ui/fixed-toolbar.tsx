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
import { useEditorRef, useEditorSelector } from 'platejs/react';
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from '@/components/ui/toolbar';
import { useListToolbarButton, useListToolbarButtonState } from '@platejs/list/react';
import { cn } from '@/lib/utils';

// Plate API is unstable across majors. The mark/heading transforms and the
// list-toolbar hook below are written for v53. Do not bump platejs or
// @platejs/* without re-running the frontend test suite and re-verifying this
// file.

type MarkName = 'bold' | 'italic' | 'underline';

function MarkButton({
  tooltip,
  mark,
  children,
}: {
  tooltip: string;
  mark: MarkName;
  children: React.ReactNode;
}) {
  const editor = useEditorRef();
  const isActive = useEditorSelector(
    (e) => {
      const marks = e.api.marks();
      return Array.isArray(marks) ? marks.includes(mark) : false;
    },
    [mark],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) {
      editor.tf.removeMarks(mark);
    } else {
      editor.tf.addMark(mark, true);
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

function HeadingButton({
  tooltip,
  level,
  children,
}: {
  tooltip: string;
  level: 1 | 2;
  children: React.ReactNode;
}) {
  const editor = useEditorRef();
  const type = `h${level}`;
  const isActive = useEditorSelector(
    (e) => e.api.some({ match: { type } }),
    [type],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.tf.setNodes(
      { type },
      { match: (n) => editor.api.isBlock(n) },
    );
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

function ListButton({
  tooltip,
  nodeType,
  children,
}: {
  tooltip: string;
  nodeType: 'ul' | 'ol';
  children: React.ReactNode;
}) {
  const state = useListToolbarButtonState({ nodeType });
  const { props } = useListToolbarButton(state);
  const { pressed, ...buttonProps } = props;

  return (
    <ToolbarButton
      {...buttonProps}
      data-state={pressed ? 'on' : 'off'}
      className={cn(pressed && 'bg-accent text-accent-foreground')}
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
      <HeadingButton tooltip="Heading 1" level={1}>
        <Heading1Icon />
      </HeadingButton>
      <HeadingButton tooltip="Heading 2" level={2}>
        <Heading2Icon />
      </HeadingButton>
      <ToolbarSeparator />
      <ListButton tooltip="Bullet list" nodeType="ul">
        <ListIcon />
      </ListButton>
      <ListButton tooltip="Numbered list" nodeType="ol">
        <ListOrderedIcon />
      </ListButton>
    </Toolbar>
  );
}
