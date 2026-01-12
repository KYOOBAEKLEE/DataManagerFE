"use client";

import React, { useState, useEffect } from 'react';
import { X, Play, CheckSquare, Square, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DatapointInfo {
    name: string;
    dataPointCount: number;
}

interface LipperAnalyzeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (id: string, datapoints: string[]) => void;
    isLoading: boolean;
}

export function LipperAnalyzeModal({ isOpen, onClose, onStart, isLoading }: LipperAnalyzeModalProps) {
    const [fundId, setFundId] = useState('40000644');
    const [availableDatapoints, setAvailableDatapoints] = useState<DatapointInfo[]>([]);
    const [selectedDatapoints, setSelectedDatapoints] = useState<Set<string>>(new Set());
    const [isLoadingDatapoints, setIsLoadingDatapoints] = useState(false);
    const [datapointsError, setDatapointsError] = useState<string | null>(null);

    const fetchDatapoints = async () => {
        setIsLoadingDatapoints(true);
        setDatapointsError(null);
        
        try {
            const response = await fetch('http://localhost:3001/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiId: 'lipper-ref-datapoints',
                    category: 'LIPPER',
                    method: 'GET',
                    endpoint: '/data/funds/v1/assets/ref/datapoints',
                    query: {}
                })
            });

            const data = await response.json();
            
            if (data.properties && Array.isArray(data.properties)) {
                const datapoints: DatapointInfo[] = data.properties.map((p: { name: string; dataPoints?: unknown[] }) => ({
                    name: p.name,
                    dataPointCount: p.dataPoints?.length || 0
                }));
                setAvailableDatapoints(datapoints);
                
                if (selectedDatapoints.size === 0) {
                    setSelectedDatapoints(new Set(['Attributes', 'Names', 'Codes']));
                }
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            setDatapointsError(error instanceof Error ? error.message : 'Failed to load datapoints');
        } finally {
            setIsLoadingDatapoints(false);
        }
    };

    useEffect(() => {
        if (isOpen && availableDatapoints.length === 0) {
            fetchDatapoints();
        }
    }, [isOpen]);

    const toggleDatapoint = (name: string) => {
        setSelectedDatapoints(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedDatapoints(new Set(availableDatapoints.map(d => d.name)));
    };

    const clearAll = () => {
        setSelectedDatapoints(new Set());
    };

    const handleStart = () => {
        if (!fundId.trim() || selectedDatapoints.size === 0) return;
        onStart(fundId.trim(), Array.from(selectedDatapoints));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[600px] max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Lipper Analyze</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Property별 데이터 분석 리포트 생성</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Fund ID (Lipper ID)
                        </label>
                        <Input
                            value={fundId}
                            onChange={(e) => setFundId(e.target.value)}
                            placeholder="예: 40000644"
                            className="bg-zinc-800 border-zinc-700 text-white"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    분석 대상 Properties
                                </label>
                                {availableDatapoints.length > 0 && (
                                    <span className="text-xs text-zinc-500">
                                        ({selectedDatapoints.size}/{availableDatapoints.length} 선택)
                                    </span>
                                )}
                                <button
                                    onClick={fetchDatapoints}
                                    disabled={isLoadingDatapoints || isLoading}
                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                                    title="새로고침"
                                >
                                    <RefreshCw className={cn("w-3 h-3", isLoadingDatapoints && "animate-spin")} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    disabled={isLoading || isLoadingDatapoints || availableDatapoints.length === 0}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                >
                                    전체 선택
                                </button>
                                <span className="text-zinc-600">|</span>
                                <button
                                    onClick={clearAll}
                                    disabled={isLoading || isLoadingDatapoints}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                                >
                                    초기화
                                </button>
                            </div>
                        </div>
                        
                        {isLoadingDatapoints ? (
                            <div className="flex items-center justify-center py-12 text-zinc-500">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm">Datapoints 로딩 중...</span>
                            </div>
                        ) : datapointsError ? (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                                <p className="text-sm text-red-400">{datapointsError}</p>
                                <button
                                    onClick={fetchDatapoints}
                                    className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                                >
                                    다시 시도
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
                                {availableDatapoints.map(dp => {
                                    const isSelected = selectedDatapoints.has(dp.name);
                                    return (
                                        <button
                                            key={dp.name}
                                            onClick={() => toggleDatapoint(dp.name)}
                                            disabled={isLoading}
                                            className={cn(
                                                "flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all",
                                                isSelected
                                                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                                                    : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800",
                                                isLoading && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <Square className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="min-w-0">
                                                <p className={cn(
                                                    "text-xs font-medium truncate",
                                                    isSelected ? "text-emerald-400" : "text-zinc-300"
                                                )}>
                                                    {dp.name}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 mt-0.5">
                                                    {dp.dataPointCount} fields
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedDatapoints.size > 0 && (
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-400">
                            <p className="flex items-center gap-1">
                                <span className="text-amber-400">⚠</span>
                                Rate Limit: 각 Property 호출 사이에 5초 대기
                            </p>
                            <p className="mt-1">
                                예상 소요 시간: 약 {Math.ceil((selectedDatapoints.size - 1) * 5 / 60)}분 {((selectedDatapoints.size - 1) * 5) % 60}초 (API) + GPT 분석
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-zinc-400"
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={isLoading || !fundId.trim() || selectedDatapoints.size === 0 || isLoadingDatapoints}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                분석 중...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                분석 시작 ({selectedDatapoints.size}개)
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
