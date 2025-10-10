import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { SignatureNode } from "./SignatureNode";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Undo,
  Redo,
  Palette,
  PenLine,
} from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>; // Returns base64 or URL
  onInsertSignature?: () => void; // Callback to insert signature at cursor
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your message...",
  minHeight = "200px",
  onImageUpload,
  onInsertSignature,
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Explicitly disable link from StarterKit if it's included
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style"),
              renderHTML: (attributes) => {
                if (!attributes.style) return {};
                return { style: attributes.style };
              },
            },
            cellpadding: {
              default: null,
              parseHTML: (element) => element.getAttribute("cellpadding"),
              renderHTML: (attributes) => {
                if (!attributes.cellpadding) return {};
                return { cellpadding: attributes.cellpadding };
              },
            },
            cellspacing: {
              default: null,
              parseHTML: (element) => element.getAttribute("cellspacing"),
              renderHTML: (attributes) => {
                if (!attributes.cellspacing) return {};
                return { cellspacing: attributes.cellspacing };
              },
            },
          };
        },
      }).configure({
        resizable: false,
        allowTableNodeSelection: false,
      }),
      TableRow.extend({
        parseHTML() {
          return [
            {
              tag: "tr",
              getAttrs: (node) => ({ style: (node as HTMLElement).getAttribute("style") }),
            },
          ];
        },
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style"),
              renderHTML: (attributes) => {
                if (!attributes.style) return {};
                return { style: attributes.style };
              },
            },
            cellpadding: {
              default: null,
              parseHTML: (element) => element.getAttribute("cellpadding"),
              renderHTML: (attributes) => {
                if (!attributes.cellpadding) return {};
                return { cellpadding: attributes.cellpadding };
              },
            },
            cellspacing: {
              default: null,
              parseHTML: (element) => element.getAttribute("cellspacing"),
              renderHTML: (attributes) => {
                if (!attributes.cellspacing) return {};
                return { cellspacing: attributes.cellspacing };
              },
            },
          };
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style"),
              renderHTML: (attributes) => {
                if (!attributes.style) return {};
                return { style: attributes.style };
              },
            },
          };
        },
      }),
      SignatureNode,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none px-3 py-2",
        style:
          "background-color: #ffffff !important; color: #000000 !important; min-height: 200px;",
      },
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColorPicker]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (onImageUpload) {
        const dataUrl = await onImageUpload(file);
        editor.chain().focus().setImage({ src: dataUrl }).run();
      } else {
        // Fallback: convert to base64 directly
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          editor.chain().focus().setImage({ src: dataUrl }).run();
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }, [editor, onImageUpload]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input rounded-md bg-background">
      <style>{`
        .ProseMirror,
        .ProseMirror.ProseMirror-focused,
        div[contenteditable="true"] {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        .ProseMirror p,
        .ProseMirror div,
        .ProseMirror span {
          color: #000000 !important;
        }
      `}</style>
      {/* Bubble Menu - appears on text selection */}
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 bg-popover border border-border rounded-md shadow-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive("bold")}
              title="Bold (Cmd+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive("italic")}
              title="Italic (Cmd+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              data-active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={setLink}
              data-active={editor.isActive("link")}
              title="Add Link"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </BubbleMenu>
      )}
      {/* Editor Content */}
      <EditorContent editor={editor} style={{ minHeight }} />

      {/* Bottom Toolbar */}
      <div className="border-t border-border p-2 flex items-center gap-1 flex-wrap bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive("bold")}
          title="Bold (Cmd+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive("italic")}
          title="Italic (Cmd+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          data-active={editor.isActive("strike")}
          title="Strikethrough (Cmd+Shift+X)"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleCode().run()}
          data-active={editor.isActive("code")}
          title="Code (Cmd+E)"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Color Picker */}
        <div className="relative" ref={colorPickerRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
          </Button>
          {showColorPicker && (
            <div className="absolute z-50 mt-1 p-2 bg-popover border border-border rounded-md shadow-lg flex gap-1">
              {[
                "#000000",
                "#ef4444",
                "#f97316",
                "#eab308",
                "#22c55e",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  title={color}
                />
              ))}
              <button
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform bg-white"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                title="Remove color"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive("bulletList")}
          title="Bullet List (Cmd+Shift+8)"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive("orderedList")}
          title="Numbered List (Cmd+Shift+7)"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive("blockquote")}
          title="Quote (Cmd+Shift+B)"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          data-active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          data-active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          data-active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={setLink}
          data-active={editor.isActive("link")}
          title="Add Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={addImage} title="Add Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus className="h-4 w-4" />
        </Button>
        {onInsertSignature && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onInsertSignature}
            title="Insert Signature"
          >
            <PenLine className="h-4 w-4" />
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .ProseMirror [data-active="true"] {
          background-color: hsl(var(--accent));
        }
        
        button[data-active="true"] {
          background-color: hsl(var(--accent));
        }
      `}</style>
    </div>
  );
}
