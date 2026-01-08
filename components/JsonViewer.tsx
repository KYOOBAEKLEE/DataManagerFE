"use client";

import React, { useRef, useCallback, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface JsonViewerProps {
    data: unknown;
    onSelectionChange?: (selection: { path: string; value: unknown } | null) => void;
}

function getJsonPath(data: unknown, position: { lineNumber: number; column: number }, jsonString: string): { path: string; value: unknown } | null {
    const lines = jsonString.split('\n');
    const targetLine = position.lineNumber - 1;
    
    if (targetLine < 0 || targetLine >= lines.length) return null;
    
    let indentStack: number[] = [];
    let keyStack: string[] = [];
    
    for (let i = 0; i <= targetLine; i++) {
        const line = lines[i];
        const indent = line.search(/\S/);
        if (indent === -1) continue;
        
        while (indentStack.length > 0 && indent <= indentStack[indentStack.length - 1]) {
            indentStack.pop();
            keyStack.pop();
        }
        
        const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
        if (keyMatch) {
            indentStack.push(indent);
            keyStack.push(keyMatch[1]);
        }
        
        const arrayMatch = line.match(/^\s*\[/);
        if (arrayMatch && i < targetLine) {
            indentStack.push(indent);
            keyStack.push('[array]');
        }
    }
    
    const path = keyStack.filter(k => k !== '[array]').join('.');
    
    let value: unknown = data;
    for (const key of keyStack.filter(k => k !== '[array]')) {
        if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
        } else {
            break;
        }
    }
    
    return path ? { path, value } : null;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, onSelectionChange }) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

    const jsonString = useMemo(() => {
        return data ? JSON.stringify(data, null, 2) : '';
    }, [data]);

    const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#09090b',
            }
        });
        monaco.editor.setTheme('custom-dark');

        editor.onDidChangeCursorSelection(() => {
            if (!onSelectionChange) return;
            
            const selection = editor.getSelection();
            if (!selection || selection.isEmpty()) {
                return;
            }

            const selectedText = editor.getModel()?.getValueInRange(selection);
            if (!selectedText || selectedText.trim().length === 0) {
                return;
            }

            const currentJsonString = editor.getValue();
            const position = selection.getStartPosition();
            const pathInfo = getJsonPath(data, position, currentJsonString);
            
            if (pathInfo) {
                try {
                    const parsed = JSON.parse(selectedText);
                    onSelectionChange({ path: pathInfo.path, value: parsed });
                } catch {
                    onSelectionChange({ path: pathInfo.path, value: selectedText });
                }
            }
        });
    }, [data, onSelectionChange]);

    if (!data) {
        return <div className="text-zinc-500 text-sm italic p-4">No data to display</div>;
    }

    return (
        <div className="h-full w-full overflow-hidden rounded-lg">
            <Editor
                height="100%"
                defaultLanguage="json"
                value={jsonString}
                theme="vs-dark"
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
