"use client";

import React, { useEffect, useState } from 'react';
import Editor, { Loader } from '@monaco-editor/react';

interface JsonViewerProps {
    data: unknown;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
    const [editorHeight, setEditorHeight] = useState('100%');

    // Configure loader to load monaco from CDN (standard) or local if configured
    // Loader.config({ paths: { vs: '...' } }); // Optional customization

    if (!data) return <div className="text-zinc-500 text-sm italic p-4">No data to display</div>;

    const jsonString = JSON.stringify(data, null, 2);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        // Define a custom theme to match the app's dark look
        // IMPORTANT: Must use a solid color, not transparent, to prevent text ghosting/tearing artifacts during scroll
        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#09090b', // Zinc 950 (Solid color)
            }
        });
        monaco.editor.setTheme('custom-dark');
    };

    return (
        <div className="h-full w-full overflow-hidden rounded-lg">
            <Editor
                height="100%"
                defaultLanguage="json"
                value={jsonString}
                theme="vs-dark" // Will be overridden by onMount to accessible transparent theme
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    folding: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'none',
                    domReadOnly: true,
                    padding: { top: 16, bottom: 16 },
                }}
                onMount={handleEditorDidMount}
                loading={<div className="text-zinc-500 p-4 text-sm">Loading editor...</div>}
            />
        </div>
    );
};
