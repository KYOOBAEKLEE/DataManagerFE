"use client";

import React, { useState } from 'react';
import { X, Download, ChevronDown, ChevronRight, FileText, Table2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PropertyAnalysis, FieldSpec } from '@/app/api/analyze/route';

interface AnalyzeReportProps {
    analyses: PropertyAnalysis[];
    fundId: string;
    onClose: () => void;
}

export function AnalyzeReport({ analyses, fundId, onClose }: AnalyzeReportProps) {
    const [expandedProperties, setExpandedProperties] = useState<Set<string>>(
        new Set(analyses.map(a => a.property))
    );
    const [viewMode, setViewMode] = useState<'all' | 'structure' | 'table'>('all');

    const toggleProperty = (property: string) => {
        setExpandedProperties(prev => {
            const next = new Set(prev);
            if (next.has(property)) {
                next.delete(property);
            } else {
                next.add(property);
            }
            return next;
        });
    };

    const handleDownloadMarkdown = () => {
        let markdown = `# Lipper Analyze Report\n\n`;
        markdown += `**Fund ID:** ${fundId}\n`;
        markdown += `**생성일:** ${new Date().toLocaleString('ko-KR')}\n\n`;
        markdown += `---\n\n`;

        for (const analysis of analyses) {
            markdown += `## ${analysis.property}\n\n`;
            
            markdown += `### 데이터 구조\n\n`;
            markdown += `\`\`\`\n${analysis.structure}\n\`\`\`\n\n`;
            
            markdown += `### 필드 명세\n\n`;
            markdown += `| Key | 한글명 | 타입 | 설명 | 예시값 |\n`;
            markdown += `|-----|--------|------|------|--------|\n`;
            
            for (const field of analysis.fields) {
                const escapedDesc = field.description.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                const escapedSample = String(field.sampleValue).replace(/\|/g, '\\|').slice(0, 50);
                markdown += `| \`${field.key}\` | ${field.koreanName} | ${field.type} | ${escapedDesc} | ${escapedSample} |\n`;
            }
            
            markdown += `\n---\n\n`;
        }

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lipper_analyze_${fundId}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadJson = () => {
        const exportData = {
            fundId,
            generatedAt: new Date().toISOString(),
            analyses: analyses.map(a => ({
                property: a.property,
                structure: a.structure,
                fields: a.fields
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lipper_analyze_${fundId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const totalFields = analyses.reduce((sum, a) => sum + a.fields.length, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[900px] max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" />
                            Lipper Analyze Report
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                            <span>Fund ID: <code className="text-emerald-400">{fundId}</code></span>
                            <span>•</span>
                            <span>{analyses.length}개 Property</span>
                            <span>•</span>
                            <span>{totalFields}개 Field</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('all')}
                                className={cn(
                                    "px-2 py-1 text-xs rounded transition-colors",
                                    viewMode === 'all' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setViewMode('structure')}
                                className={cn(
                                    "px-2 py-1 text-xs rounded transition-colors",
                                    viewMode === 'structure' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                구조만
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "px-2 py-1 text-xs rounded transition-colors",
                                    viewMode === 'table' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                표만
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadMarkdown}
                            className="text-zinc-400 hover:text-white text-xs"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            MD
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadJson}
                            className="text-zinc-400 hover:text-white text-xs"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            JSON
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {analyses.map(analysis => {
                        const isExpanded = expandedProperties.has(analysis.property);
                        
                        return (
                            <div 
                                key={analysis.property}
                                className="bg-zinc-800/30 rounded-xl border border-zinc-800 overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleProperty(analysis.property)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                                        )}
                                        <span className="text-white font-semibold">{analysis.property}</span>
                                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                            {analysis.fields.length}개 필드
                                        </span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-4">
                                        {(viewMode === 'all' || viewMode === 'structure') && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Code className="w-4 h-4 text-cyan-400" />
                                                    <h4 className="text-sm font-medium text-zinc-300">데이터 구조</h4>
                                                </div>
                                                <pre className="bg-zinc-900 rounded-lg p-4 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                                    {analysis.structure}
                                                </pre>
                                            </div>
                                        )}

                                        {(viewMode === 'all' || viewMode === 'table') && analysis.fields.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Table2 className="w-4 h-4 text-emerald-400" />
                                                    <h4 className="text-sm font-medium text-zinc-300">필드 명세</h4>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-zinc-900 text-left">
                                                                <th className="px-3 py-2 text-xs font-semibold text-zinc-400">Key</th>
                                                                <th className="px-3 py-2 text-xs font-semibold text-zinc-400">한글명</th>
                                                                <th className="px-3 py-2 text-xs font-semibold text-zinc-400">타입</th>
                                                                <th className="px-3 py-2 text-xs font-semibold text-zinc-400">설명</th>
                                                                <th className="px-3 py-2 text-xs font-semibold text-zinc-400">예시값</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {analysis.fields.map((field, idx) => (
                                                                <FieldRow key={idx} field={field} />
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function FieldRow({ field }: { field: FieldSpec }) {
    return (
        <tr className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
            <td className="px-3 py-2">
                <code className="text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                    {field.key}
                </code>
            </td>
            <td className="px-3 py-2 text-white font-medium text-xs">{field.koreanName}</td>
            <td className="px-3 py-2">
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {field.type}
                </span>
            </td>
            <td className="px-3 py-2 text-zinc-400 text-xs max-w-[250px]">{field.description}</td>
            <td className="px-3 py-2 text-zinc-500 text-xs font-mono max-w-[150px] truncate">
                {String(field.sampleValue).slice(0, 50)}
            </td>
        </tr>
    );
}
