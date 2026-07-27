'use client';

import * as React from 'react';
import { PlateElement, type PlateElementProps } from 'platejs/react';
import { cn } from '@/lib/utils';

export const EditorContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative w-full cursor-text rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className,
      )}
      {...props}
    />
  ),
);
EditorContainer.displayName = 'EditorContainer';

export interface EditorProps extends PlateElementProps {
  className?: string;
}

export const Editor = React.forwardRef<HTMLDivElement, EditorProps>(
  ({ className, ...props }, ref) => (
    <PlateElement
      ref={ref}
      className={cn('outline-none', className)}
      {...props}
    />
  ),
);
Editor.displayName = 'Editor';
