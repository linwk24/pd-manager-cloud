'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '@tiptap/extension-font-size';
import { Typography } from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  ChevronDown,
  Minus,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useState, useCallback } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function SelectButton({
  value,
  onChange,
  options,
  title,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  title: string;
}) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-1 text-xs bg-transparent border border-border rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const FONT_FAMILIES = [
  { value: 'inherit', label: '默认' },
  { value: 'serif', label: '宋体' },
  { value: 'sans-serif', label: '黑体' },
  { value: 'monospace', label: '等宽' },
  { value: 'cursive', label: '手写' },
];

const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
  { value: '36px', label: '36' },
];

// 预设颜色网格 (5行8列)
const COLOR_PRESETS = [
  ['#000000', '#FFFFFF', '#EEECE1', '#9E9E9E', '#4A4A4A', '#C23531', '#D83A3A', '#E74C3C'],
  ['#FF6600', '#FFA500', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50', '#009688'],
  ['#00BCD4', '#03A9F4', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0', '#E91E63', '#F44336'],
  ['#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B'],
  ['#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000', '#FF8F00'],
];

function ColorPicker({ editor }: { editor: any }) {
  const [showPicker, setShowPicker] = useState(false);

  const getCurrentColor = () => {
    return editor.getAttributes('textStyle').color || '#000000';
  };

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowPicker(false);
  };

  const clearColor = () => {
    editor.chain().focus().unsetColor().run();
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="字体颜色"
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50"
      >
        <span className="font-bold">A</span>
        <span
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: getCurrentColor() }}
        />
      </button>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="grid grid-cols-8 gap-1">
              {COLOR_PRESETS.flat().map((color, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColor(color)}
                  className="w-5 h-5 rounded border border-border hover:ring-2 hover:ring-primary transition-all"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={clearColor}
                className="flex-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded"
              >
                清除颜色
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const MenuBar = ({ editor, isFullscreen, onFullscreenChange }: { editor: any; isFullscreen?: boolean; onFullscreenChange?: (v: boolean) => void }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImageInput(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  const getCurrentFontSize = () => {
    const size = editor.getAttributes('textStyle').fontSize;
    return size || '16px';
  };

  const getCurrentFontFamily = () => {
    const family = editor.getAttributes('textStyle').fontFamily;
    return family || 'inherit';
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 flex-wrap shrink-0">
      {/* 撤销/重做 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销 (Ctrl+Z)"
      >
        <Undo2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做 (Ctrl+Y)"
      >
        <Redo2 size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 基础格式 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="粗体 (Ctrl+B)"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="删除线"
      >
        <Strikethrough size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 字体 */}
      <SelectButton
        value={getCurrentFontFamily()}
        onChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        options={FONT_FAMILIES}
        title="字体"
      />

      {/* 字号 */}
      <SelectButton
        value={getCurrentFontSize()}
        onChange={(value) => editor.chain().focus().setFontSize(value).run()}
        options={FONT_SIZES}
        title="字号"
      />

      {/* 字体颜色 */}
      <ColorPicker editor={editor} />

      <div className="w-px h-5 bg-border mx-1" />

      {/* 标题 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="标题1"
      >
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="标题2"
      >
        <Heading2 size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 对齐 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="左对齐"
      >
        <AlignLeft size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="居中对齐"
      >
        <AlignCenter size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="右对齐"
      >
        <AlignRight size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        active={editor.isActive({ textAlign: 'justify' })}
        title="两端对齐"
      >
        <AlignJustify size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 列表 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        title="减少缩进"
      >
        <Minus size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        title="增加缩进"
      >
        <ChevronDown size={15} className="rotate-180" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 引用和代码 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="引用"
      >
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="代码块"
      >
        <Code size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 链接 */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          active={editor.isActive('link')}
          title="链接"
        >
          <LinkIcon size={15} />
        </ToolbarButton>
        {showLinkInput && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-md shadow-md z-10 flex gap-2">
            <input
              type="url"
              placeholder="输入链接地址"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setLink()}
              className="px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={setLink}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              确认
            </button>
            {editor.isActive('link') && (
              <button
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkInput(false);
                }}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-accent"
              >
                移除
              </button>
            )}
          </div>
        )}
      </div>

      {/* 图片 */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowImageInput(!showImageInput)}
          title="图片"
        >
          <ImageIcon size={15} />
        </ToolbarButton>
        {showImageInput && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-md shadow-md z-10 flex gap-2">
            <input
              type="url"
              placeholder="输入图片地址"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && insertImage()}
              className="px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={insertImage}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              插入
            </button>
          </div>
        )}
      </div>

      {/* 表格 */}
      <ToolbarButton onClick={insertTable} title="插入表格">
        <TableIcon size={15} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* 全屏切换 */}
      <ToolbarButton
        onClick={() => onFullscreenChange?.(!isFullscreen)}
        title={isFullscreen ? '退出全屏' : '全屏编辑'}
      >
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </ToolbarButton>
    </div>
  );
};

export function TipTapEditor({ content, onChange, placeholder, isFullscreen: externalFullscreen, onFullscreenChange }: TipTapEditorProps) {
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalFullscreen ?? internalFullscreen;
  const setFullscreen = (v: boolean) => {
    setInternalFullscreen(v);
    onFullscreenChange?.(v);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Typography,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-full px-4 py-3 text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_li]:pl-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:bg-muted [&_pre]:rounded [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_img]:max-w-full [&_img]:h-auto',
        placeholder: placeholder || '写下你的想法...',
      },
    },
  });

  return (
    <div
      className={`border border-border rounded-md overflow-hidden bg-background flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      style={isFullscreen ? { top: 0, left: 0, right: 0, bottom: 0 } : {}}
    >
      <MenuBar editor={editor} isFullscreen={isFullscreen} onFullscreenChange={setFullscreen} />
      <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'h-[calc(100vh-45px)]' : ''}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
