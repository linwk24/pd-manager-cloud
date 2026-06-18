'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
} from 'lucide-react';
import { useCallback } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  );
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const buttons: ({ action: () => void; active: boolean; icon: React.ReactNode; title: string } | { type: 'divider' })[] = [
    { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), icon: <Bold size={15} />, title: '粗体' },
    { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), icon: <Italic size={15} />, title: '斜体' },
    { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), icon: <UnderlineIcon size={15} />, title: '下划线' },
    { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), icon: <Strikethrough size={15} />, title: '删除线' },
    { type: 'divider' },
    { action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), icon: <Heading1 size={15} />, title: '标题1' },
    { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), icon: <Heading2 size={15} />, title: '标题2' },
    { type: 'divider' },
    { action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), icon: <List size={15} />, title: '无序列表' },
    { action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), icon: <ListOrdered size={15} />, title: '有序列表' },
    { action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), icon: <Quote size={15} />, title: '引用' },
    { action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), icon: <Code size={15} />, title: '代码块' },
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
      {buttons.map((btn, i) => {
        if ('type' in btn) {
          return <div key={i} className="w-px h-5 bg-border mx-1" />;
        }
        return (
          <ToolbarButton key={i} onClick={btn.action} active={btn.active} title={btn.title}>
            {btn.icon}
          </ToolbarButton>
        );
      })}
    </div>
  );
};

export function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[300px] px-4 py-3 text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-serif-display [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-serif-display [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:bg-muted [&_pre]:rounded [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs',
        placeholder: placeholder || '写下你的想法...',
      },
    },
  });

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
