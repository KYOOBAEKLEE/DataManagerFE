"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Star, Copy, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisResult {
    path: string;
    fieldName: string;
    dataName: string;
    description: string;
    sampleValue: string;
    dataType: string;
    depth: number;
    isImportant: boolean;
}

interface AnalysisTableProps {
    results: AnalysisResult[];
    stats: {
        originalSize: number;
        flattenedCount: number;
        compressionRatio: string;
    };
    onClose: () => void;
}

function formatPath(path: string): string {
    return path.replace(/\[\]/g, '');
}

function getIndentLevel(path: string): number {
    const cleanPath = formatPath(path);
    return (cleanPath.match(/\./g) || []).length;
}

const TYPE_COLORS: Record<string, string> = {
    string: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    number: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    boolean: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    array: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    object: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    null: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function AnalysisTable({ results, stats, onClose }: AnalysisTableProps) {
    const [copiedPath, setCopiedPath] = React.useState<string | null>(null);

    const handleCopyPath = async (path: string) => {
        await navigator.clipboard.writeText(formatPath(path));
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    const importantCount = results.filter(r => r.isImportant).length;

    return (
        <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        Data Specification
                        {importantCount > 0 && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {importantCount} important
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        {results.length} fields | {(stats.originalSize / 1024).toFixed(1)}KB | {stats.compressionRatio} reduced
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-[1fr,140px,1fr,160px] gap-0 text-xs font-medium text-zinc-400 uppercase border-b border-zinc-800 bg-zinc-950/50 shrink-0">
                <div className="px-4 py-2">Field Path</div>
                <div className="px-4 py-2 border-l border-zinc-800">Name</div>
                <div className="px-4 py-2 border-l border-zinc-800">Description</div>
                <div className="px-4 py-2 border-l border-zinc-800">Sample Value</div>
            </div>

            <div className="flex-1 overflow-auto">
                {results.map((result, idx) => (
                    <FieldRow
                        key={idx}
                        result={result}
                        onCopyPath={handleCopyPath}
                        isCopied={copiedPath === result.path}
                    />
                ))}
            </div>
        </Card>
    );
}

interface FieldRowProps {
    result: AnalysisResult;
    onCopyPath: (path: string) => void;
    isCopied: boolean;
}

function FieldRow({ result, onCopyPath, isCopied }: FieldRowProps) {
    const indent = getIndentLevel(result.path);
    const displayPath = formatPath(result.path);
    const typeColor = TYPE_COLORS[result.dataType] || TYPE_COLORS.string;

    return (
        <div className={cn(
            "grid grid-cols-[1fr,140px,1fr,160px] gap-0 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group",
            result.isImportant && "bg-amber-500/5"
        )}>
            <div className="px-4 py-3 flex items-start gap-1">
                <div 
                    className="flex items-center gap-1 min-w-0 cursor-pointer group/path"
                    onClick={() => onCopyPath(result.path)}
                    style={{ paddingLeft: `${indent * 16}px` }}
                >
                    {indent > 0 && (
                        <span className="text-zinc-700 shrink-0">
                            {Array(indent).fill(null).map((_, i) => (
                                <ChevronRight key={i} className="w-3 h-3 inline-block -ml-1" />
                            ))}
                        </span>
                    )}
                    <span className={cn(
                        "font-mono text-[11px] truncate",
                        result.isImportant ? "text-amber-300" : "text-zinc-300"
                    )}>
                        {result.fieldName || displayPath.split('.').pop()}
                    </span>
                    {result.isImportant && (
                        <Star className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                        <Copy className="w-3 h-3 text-zinc-600 opacity-0 group-hover/path:opacity-100 shrink-0" />
                    )}
                </div>
            </div>

            <div className="px-4 py-3 border-l border-zinc-800/50 flex items-start gap-2">
                <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border shrink-0",
                    typeColor
                )}>
                    {result.dataType}
                </span>
                <span className="text-sm text-white font-medium truncate">
                    {result.dataName}
                </span>
            </div>

            <div className="px-4 py-3 border-l border-zinc-800/50">
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {result.description}
                </p>
            </div>

            <div className="px-4 py-3 border-l border-zinc-800/50">
                <code className="text-[11px] text-emerald-400 bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono block truncate">
                    {result.sampleValue}
                </code>
            </div>
        </div>
    );
}
