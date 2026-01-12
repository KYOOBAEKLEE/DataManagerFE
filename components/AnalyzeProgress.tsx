"use client";

import React from 'react';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalyzeProgressState {
    phase: 'idle' | 'fetching' | 'analyzing' | 'complete' | 'error';
    fetchProgress?: {
        current: number;
        total: number;
        property: string;
        status: 'fetching' | 'waiting' | 'complete' | 'error';
        waitSeconds?: number;
    };
    analyzeProgress?: {
        current: number;
        total: number;
        property: string;
    };
    error?: string;
}

interface AnalyzeProgressProps {
    progress: AnalyzeProgressState;
}

export function AnalyzeProgress({ progress }: AnalyzeProgressProps) {
    const { phase, fetchProgress, analyzeProgress, error } = progress;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[450px] p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    {phase === 'error' ? (
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    ) : phase === 'complete' ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {phase === 'fetching' && 'API 데이터 수집 중...'}
                            {phase === 'analyzing' && 'GPT 분석 중...'}
                            {phase === 'complete' && '분석 완료!'}
                            {phase === 'error' && '오류 발생'}
                        </h3>
                        <p className="text-xs text-zinc-500">
                            {phase === 'fetching' && 'Property별 데이터를 순차적으로 가져옵니다'}
                            {phase === 'analyzing' && 'GPT-5.2가 각 Property를 분석합니다'}
                            {phase === 'complete' && '리포트가 준비되었습니다'}
                            {phase === 'error' && error}
                        </p>
                    </div>
                </div>

                {(phase === 'fetching' || phase === 'analyzing') && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-400">
                                    Phase 1: API 수집
                                </span>
                                <span className="text-zinc-500">
                                    {fetchProgress ? `${fetchProgress.current}/${fetchProgress.total}` : '-'}
                                </span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        phase === 'fetching' ? "bg-emerald-500" : "bg-emerald-600"
                                    )}
                                    style={{ 
                                        width: fetchProgress 
                                            ? `${(fetchProgress.current / fetchProgress.total) * 100}%` 
                                            : '0%' 
                                    }}
                                />
                            </div>
                            {fetchProgress && phase === 'fetching' && (
                                <div className="mt-2 text-xs">
                                    {fetchProgress.status === 'fetching' && (
                                        <span className="text-emerald-400">
                                            <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                                            {fetchProgress.property} 데이터 수집 중...
                                        </span>
                                    )}
                                    {fetchProgress.status === 'waiting' && (
                                        <span className="text-amber-400">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Rate Limit 대기 중... ({fetchProgress.waitSeconds}초)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-400">
                                    Phase 2: GPT 분석
                                </span>
                                <span className="text-zinc-500">
                                    {analyzeProgress ? `${analyzeProgress.current}/${analyzeProgress.total}` : '-'}
                                </span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        phase === 'analyzing' ? "bg-cyan-500" : "bg-zinc-700"
                                    )}
                                    style={{ 
                                        width: analyzeProgress 
                                            ? `${(analyzeProgress.current / analyzeProgress.total) * 100}%` 
                                            : '0%' 
                                    }}
                                />
                            </div>
                            {analyzeProgress && phase === 'analyzing' && (
                                <div className="mt-2 text-xs text-cyan-400">
                                    <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                                    {analyzeProgress.property} 분석 중...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {phase === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
