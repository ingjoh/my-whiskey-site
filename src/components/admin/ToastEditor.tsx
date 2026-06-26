'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import editor CSS styles
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

// Load Toast UI Editor dynamically to prevent SSR "window is not defined" error
const DynamicEditor = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Editor),
  { 
    ssr: false,
    loading: () => (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
        <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>Loading Visual Editor...</span>
      </div>
    )
  }
);

interface ToastEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  height?: string;
}

export default function ToastEditor({ initialValue, onChange, height = '450px' }: ToastEditorProps) {
  const editorRef = useRef<any>(null);

  // Sync external initialValue updates (like AI text generation) with the editor instance
  useEffect(() => {
    if (editorRef.current) {
      const instance = editorRef.current.getInstance();
      const currentMarkdown = instance.getMarkdown();
      if (initialValue !== currentMarkdown) {
        instance.setMarkdown(initialValue || '');
      }
    }
  }, [initialValue]);

  const handleChange = () => {
    if (editorRef.current) {
      const instance = editorRef.current.getInstance();
      const markdown = instance.getMarkdown();
      onChange(markdown);
    }
  };

  return (
    <div style={{ width: '100%' }} className="dark-toast-editor">
      <DynamicEditor
        ref={editorRef}
        initialValue={initialValue || ' '}
        previewStyle="tab"
        height={height}
        initialEditType="wysiwyg"
        useCommandShortcut={true}
        onChange={handleChange}
        theme="dark"
        toolbarItems={[
          ['heading', 'bold', 'italic', 'strike'],
          ['hr', 'quote'],
          ['ul', 'ol', 'task', 'indent', 'outdent'],
          ['table', 'image', 'link'],
          ['code', 'codeblock']
        ]}
      />
      {/* Inject custom CSS overrides to theme the editor borders and text to match our premium aesthetic */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dark-toast-editor .toastui-editor-defaultUI {
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 6px !important;
          background: #121416 !important;
          font-family: inherit !important;
        }
        .dark-toast-editor .toastui-editor-toolbar {
          background: #1e2124 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-top-left-radius: 6px !important;
          border-top-right-radius: 6px !important;
        }
        .dark-toast-editor .toastui-editor-defaultUI-toolbar button {
          border: 1px solid transparent !important;
          border-radius: 4px !important;
        }
        .dark-toast-editor .toastui-editor-ww-container,
        .dark-toast-editor .toastui-editor-md-container {
          background: #121416 !important;
        }
        .dark-toast-editor .toastui-editor-contents {
          font-family: var(--font-sans, sans-serif) !important;
          color: #F4F1EA !important;
          font-size: 0.9rem !important;
        }
        .dark-toast-editor .toastui-editor-contents h1,
        .dark-toast-editor .toastui-editor-contents h2,
        .dark-toast-editor .toastui-editor-contents h3,
        .dark-toast-editor .toastui-editor-contents h4 {
          font-family: var(--font-heading, serif) !important;
          color: #F4F1EA !important;
        }
        .dark-toast-editor .toastui-editor-contents p {
          color: #F4F1EA !important;
        }
        .dark-toast-editor .toastui-editor-contents strong {
          color: #F4F1EA !important;
        }
      `}} />
    </div>
  );
}
