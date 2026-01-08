"use client";

import React from 'react';
import { Loader2, CheckCircle2, Database, Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisProgressState {
    stage: 'idle' | 'flatten' | 'flatten_complete' | 'analyze_start' | 'analyzing' | 'section_complete' | 'complete' | 'error';
    message: string;
    currentSection?: string;
    currentGroup?: number;
    totalGroups?: number;
    fieldsAnalyzed?: number;
    sections?: string[];
    stats?: {
        originalSize: number;
        flattenedCount: number;
        compressionRatio: string;
    };
}

interface AnalysisProgressProps {
    progress: AnalysisProgressState;
}

const stages = [
    { key: 'flatten', label: 'Preprocessing', icon: Database },
    { key: 'analyze', label: 'AI Analysis', icon: Sparkles },
    { key: 'complete', label: 'Complete', icon: Package },
];

function getStageIndex(stage: AnalysisProgressState['stage']): number {
    if (stage === 'flatten') return 0;
    if (stage === 'flatten_complete') return 0.5;
    if (stage === 'analyze_start' || stage === 'analyzing' || stage === 'section_complete') return 1;
    if (stage === 'complete') return 2;
    return -1;
}

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
    const currentStageIndex = getStageIndex(progress.stage);
    const groupProgress = progress.totalGroups 
        ? ((progress.currentGroup || 0) / progress.totalGroups) * 100 
        : 0;

    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-full max-w-lg">
                <div className="flex items-center justify-between mb-8">
                    {stages.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isActive = Math.floor(currentStageIndex) === idx;
                        const isComplete = currentStageIndex > idx;
                        
                        return (
                            <React.Fragment key={stage.key}>
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                        isComplete ? "bg-emerald-500" :
                                        isActive ? "bg-emerald-500/20 border-2 border-emerald-500" :
                                        "bg-zinc-800 border-2 border-zinc-700"
                                    )}>
                                        {isActive && !isComplete ? (
                                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                        ) : isComplete ? (
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        ) : (
                                            <Icon className="w-5 h-5 text-zinc-500" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs mt-2 font-medium",
                                        isActive || isComplete ? "text-emerald-400" : "text-zinc-500"
                                    )}>
                                        {stage.label}
                                    </span>
                                </div>
                                
                                {idx < stages.length - 1 && (
                                    <div className={cn(
                                        "flex-1 h-0.5 mx-2 transition-colors duration-300",
                                        currentStageIndex > idx ? "bg-emerald-500" : "bg-zinc-700"
                                    )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                    <p className="text-sm text-zinc-300 text-center mb-3">
                        {progress.message}
                    </p>

                    {(progress.stage === 'analyzing' || progress.stage === 'section_complete') && progress.totalGroups ? (
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>Section {progress.currentGroup}/{progress.totalGroups}</span>
                                <span>{Math.round(groupProgress)}%</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out"
                                    style={{ width: `${groupProgress}%` }}
                                />
                            </div>
                            {progress.currentSection && (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-zinc-600">Current:</span>
                                    <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                                        {progress.currentSection}
                                    </span>
                                </div>
                            )}
                            {progress.fieldsAnalyzed !== undefined && (
                                <p className="text-xs text-zinc-500 text-center">
                                    {progress.fieldsAnalyzed} fields analyzed
                                </p>
                            )}
                        </div>
                    ) : progress.sections && progress.sections.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-zinc-500 text-center">Sections to analyze:</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {progress.sections.map((section, idx) => (
                                    <span 
                                        key={idx}
                                        className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-mono"
                                    >
                                        {section}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : progress.stats ? (
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-zinc-800 rounded p-2">
                                <p className="text-lg font-bold text-white">
                                    {(progress.stats.originalSize / 1024).toFixed(1)}
                                </p>
                                <p className="text-[10px] text-zinc-500 uppercase">KB Original</p>
                            </div>
                            <div className="bg-zinc-800 rounded p-2">
                                <p className="text-lg font-bold text-emerald-400">
                                    {progress.stats.flattenedCount}
                                </p>
                                <p className="text-[10px] text-zinc-500 uppercase">Fields</p>
                            </div>
                            <div className="bg-zinc-800 rounded p-2">
                                <p className="text-lg font-bold text-amber-400">
                                    {progress.stats.compressionRatio}
                                </p>
                                <p className="text-[10px] text-zinc-500 uppercase">Reduced</p>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex justify-center mt-6">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span>Semantic analysis by GPT-4.1</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
