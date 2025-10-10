import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button } from "@/components/ui/button";
import { Save, Eye } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => void;
  placeholder?: string;
  height?: number;
}

export interface RichTextEditorRef {
  insertContent: (content: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, onSave, placeholder = "Start writing...", height = 400 }, ref) => {
    const editorRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      insertContent: (content: string) => {
        if (editorRef.current) {
          editorRef.current.insertContent(content);
        }
      },
    }));

    const handleEditorChange = (content: string) => {
      onChange(content);
    };

    const handleSave = () => {
      if (onSave && editorRef.current) {
        const content = editorRef.current.getContent();
        onSave(content);
      }
    };

    const handlePreview = () => {
      if (editorRef.current) {
        const content = editorRef.current.getContent();
        const previewWindow = window.open("", "_blank");
        if (previewWindow) {
          previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Article Preview</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 800px; 
                margin: 40px auto; 
                padding: 20px; 
                line-height: 1.6; 
                color: #333;
              }
              h1, h2, h3 { color: #2d3748; margin-top: 2em; }
              h1 { border-bottom: 2px solid #f97316; padding-bottom: 10px; }
              h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
              ul, ol { padding-left: 20px; }
              blockquote { 
                border-left: 4px solid #f97316; 
                margin: 20px 0; 
                padding: 10px 20px; 
                background: #fef5e7; 
              }
              code { background: #f1f5f9; padding: 2px 4px; border-radius: 3px; }
              pre { background: #f8fafc; padding: 15px; border-radius: 5px; overflow-x: auto; }
              .close-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f97316;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                z-index: 1000;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: background-color 0.2s;
              }
              .close-button:hover {
                background: #ea580c;
              }
            </style>
          </head>
          <body>
            <button class="close-button" onclick="window.close()">✕ Close Preview</button>
            ${content}
          </body>
          </html>
        `);
          previewWindow.document.close();
        }
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Rich Text Editor</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            {onSave && (
              <Button size="sm" onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
            onInit={(evt, editor) => (editorRef.current = editor)}
            value={content}
            onEditorChange={handleEditorChange}
            init={{
              height,
              menubar: false,
              plugins: [
                "advlist",
                "autolink",
                "lists",
                "link",
                "image",
                "charmap",
                "preview",
                "anchor",
                "searchreplace",
                "visualblocks",
                "code",
                "fullscreen",
                "insertdatetime",
                "media",
                "table",
                "code",
                "help",
                "wordcount",
              ],
              toolbar:
                "undo redo | blocks | " +
                "bold italic forecolor | alignleft aligncenter " +
                "alignright alignjustify | bullist numlist outdent indent | " +
                "removeformat | help",
              content_style: `
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                font-size: 14px; 
                line-height: 1.6; 
                color: #333;
              }
              h1, h2, h3 { color: #2d3748; }
              h1 { border-bottom: 2px solid #f97316; padding-bottom: 10px; }
              h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            `,
              placeholder,
              branding: false,
              resize: false,
              statusbar: false,
              contextmenu: "link image table",
              skin: "oxide",
              content_css: "default",
            }}
          />
        </div>
      </div>
    );
  }
);
