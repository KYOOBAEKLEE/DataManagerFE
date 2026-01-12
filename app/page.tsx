"use client";

import React, { useState, useEffect } from 'react';
import { ApiCatalog } from '@/components/ApiCatalog';
import { ParameterForm } from '@/components/ParameterForm';
import { JsonViewer } from '@/components/JsonViewer';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, Zap, Play, X, Download, MessageSquare, Sparkles } from 'lucide-react';
import { AgentChat, Message, JsonReference } from '@/components/AgentChat';
import { LipperAnalyzeModal } from '@/components/LipperAnalyzeModal';
import { AnalyzeProgress, AnalyzeProgressState } from '@/components/AnalyzeProgress';
import { AnalyzeReport } from '@/components/AnalyzeReport';
import { PropertyAnalysis } from '@/app/api/analyze/route';

import { cn } from '@/lib/utils';

interface ApiMetadata {
    id: string;
    name: string;
    category: string;
    description: string;
    endpoint: string;
    method: string;
    parameters: { name: string; type: string; required: boolean; description: string; default?: unknown; options?: string[] }[];
}

interface TabData {
    id: string;
    api: ApiMetadata;
    result: unknown | null;
    executedUrl: string;
    editableUrl: string;
    isLoading: boolean;
}

export default function Home() {
    const [apis, setApis] = useState<ApiMetadata[]>([]);
    const [tabs, setTabs] = useState<TabData[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [jsonReference, setJsonReference] = useState<JsonReference | null>(null);

    const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgressState>({ phase: 'idle' });
    const [analyzeResult, setAnalyzeResult] = useState<{ analyses: PropertyAnalysis[]; fundId: string } | null>(null);

    const activeTab = tabs.find(t => t.id === activeTabId) || null;

    useEffect(() => {
        fetch('http://localhost:3001/api/discovery')
            .then(res => res.json())
            .then(data => setApis(data.apis))
            .catch(err => console.error('Failed to load APIs', err));
    }, []);

    const updateActiveTab = (updates: Partial<TabData>) => {
        if (!activeTabId) return;
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, ...updates } : tab
        ));
    };

    const handleAddTab = (api: ApiMetadata) => {
        const newTab: TabData = {
            id: crypto.randomUUID(),
            api,
            result: null,
            executedUrl: '',
            editableUrl: '',
            isLoading: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                const nextTab = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
                setActiveTabId(nextTab ? nextTab.id : null);
            }
            return newTabs;
        });
    };

    const filterEmptyParams = (params: Record<string, unknown>): Record<string, unknown> => {
        const filtered: Record<string, unknown> = {};
        Object.entries(params).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                filtered[key] = value;
            }
        });
        return filtered;
    };

    const handleCallApi = async (values: Record<string, unknown>) => {
        if (!activeTab) return;

        updateActiveTab({ isLoading: true });

        let processedBody = undefined;
        const processedQuery = { ...values };
        let finalEndpoint = activeTab.api.endpoint;

        const pathParams = finalEndpoint.match(/{([^}]+)}/g);
        if (pathParams) {
            pathParams.forEach((param) => {
                const key = param.slice(1, -1);
                if (processedQuery[key]) {
                    finalEndpoint = finalEndpoint.replace(param, String(processedQuery[key]));
                    delete processedQuery[key];
                }
            });
        }

        if (activeTab.api.method !== 'GET' && values.body) {
            try {
                if (typeof values.body === 'string') {
                    processedBody = JSON.parse(values.body);
                } else {
                    processedBody = values.body;
                }
                delete processedQuery.body;
            } catch {
                updateActiveTab({
                    result: { error: "Invalid JSON Body", details: "Please check your JSON syntax." },
                    isLoading: false
                });
                return;
            }
        } else if (activeTab.api.method !== 'GET') {
            processedBody = processedQuery;
        }

        const filteredQuery = filterEmptyParams(processedQuery);

        const baseUrl = 'https://api.refinitiv.com';
        let displayUrl = `${baseUrl}${finalEndpoint}`;
        if (activeTab.api.method === 'GET' && Object.keys(filteredQuery).length > 0) {
            const queryParams: Record<string, string> = {};
            Object.entries(filteredQuery).forEach(([key, value]) => {
                queryParams[key] = String(value);
            });
            const queryString = new URLSearchParams(queryParams).toString();
            displayUrl += `?${queryString}`;
        }

        updateActiveTab({ executedUrl: displayUrl, editableUrl: displayUrl });

        try {
            const response = await fetch('http://localhost:3001/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiId: activeTab.api.id,
                    category: activeTab.api.category,
                    method: activeTab.api.method,
                    endpoint: finalEndpoint,
                    query: activeTab.api.method === 'GET' ? filteredQuery : undefined,
                    body: processedBody
                })
            });
            const data = await response.json();
            updateActiveTab({ result: data, isLoading: false });
        } catch (error) {
            updateActiveTab({
                result: { error: 'Failed to fetch data', details: error },
                isLoading: false
            });
        }
    };

    const handleExecuteFromUrl = async () => {
        if (!activeTab || !activeTab.editableUrl) return;

        updateActiveTab({ isLoading: true });

        try {
            const baseUrl = 'https://api.refinitiv.com';
            const urlWithoutBase = activeTab.editableUrl.startsWith(baseUrl)
                ? activeTab.editableUrl.substring(baseUrl.length)
                : activeTab.editableUrl;

            const [endpoint, queryString] = urlWithoutBase.split('?');
            const query: Record<string, string> = {};
            if (queryString) {
                const params = new URLSearchParams(queryString);
                params.forEach((value, key) => {
                    query[key] = value;
                });
            }

            updateActiveTab({ executedUrl: activeTab.editableUrl });

            const response = await fetch('http://localhost:3001/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiId: activeTab.api.id,
                    category: activeTab.api.category,
                    method: activeTab.api.method,
                    endpoint: endpoint,
                    query: activeTab.api.method === 'GET' ? query : undefined,
                    body: activeTab.api.method !== 'GET' ? query : undefined
                })
            });
            const data = await response.json();
            updateActiveTab({ result: data, isLoading: false });
        } catch (error) {
            updateActiveTab({
                result: { error: 'Failed to execute from URL', details: error },
                isLoading: false
            });
        }
    };

    const handleDownloadJson = () => {
        if (!activeTab?.result) return;

        const jsonString = JSON.stringify(activeTab.result, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab.api.name.replace(/\s+/g, '_')}_response.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleAnalyze = async () => {
        if (!activeTab?.result) return;

        setIsAnalyzing(true);
        setAnalysisResults(null);
        setAnalysisStats(null);
        setAnalysisProgress({ stage: 'flatten', message: 'Starting analysis...' });

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonData: activeTab.result })
            });

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Failed to get response reader');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const { event, data } = JSON.parse(line.slice(6));

                            if (event === 'progress') {
                                setAnalysisProgress({
                                    stage: data.stage,
                                    message: data.message,
                                    currentSection: data.currentSection,
                                    currentGroup: data.currentGroup,
                                    totalGroups: data.totalGroups,
                                    fieldsAnalyzed: data.fieldsAnalyzed,
                                    sections: data.sections,
                                    stats: data.stats
                                });
                            } else if (event === 'complete') {
                                setAnalysisResults(data.results);
                                setAnalysisStats(data.stats);
                                setAnalysisProgress({ stage: 'complete', message: 'Analysis complete!' });
                            } else if (event === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (parseError) {
                            if (parseError instanceof SyntaxError) continue;
                            throw parseError;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysisProgress({ stage: 'error', message: error instanceof Error ? error.message : 'Analysis failed' });
            alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCloseAnalysis = () => {
        setAnalysisResults(null);
        setAnalysisStats(null);
    };

    const handleJsonSelection = (selection: { path: string; value: unknown } | null) => {
        if (selection && isChatOpen) {
            setJsonReference(selection);
        }
    };

    const handleStartAnalyze = async (id: string, datapoints: string[]) => {
        setIsAnalyzing(true);
        setIsAnalyzeModalOpen(false);
        setAnalyzeProgress({ phase: 'fetching' });

        try {
            const fetchResponse = await fetch('http://localhost:3001/api/lipper-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, datapoints })
            });

            const reader = fetchResponse.body?.getReader();
            if (!reader) throw new Error('Failed to get response reader');

            const decoder = new TextDecoder();
            let buffer = '';
            let propertyResults: Array<{ property: string; data: unknown; error?: string }> = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const { event, data } = JSON.parse(line.slice(6));

                            if (event === 'progress') {
                                setAnalyzeProgress({
                                    phase: 'fetching',
                                    fetchProgress: {
                                        current: data.current,
                                        total: data.total,
                                        property: data.property,
                                        status: 'fetching'
                                    }
                                });
                            } else if (event === 'waiting') {
                                setAnalyzeProgress(prev => ({
                                    ...prev,
                                    fetchProgress: {
                                        ...prev.fetchProgress!,
                                        status: 'waiting',
                                        waitSeconds: data.seconds
                                    }
                                }));
                            } else if (event === 'complete') {
                                propertyResults = data.results;
                            } else if (event === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (parseError) {
                            if (parseError instanceof SyntaxError) continue;
                            throw parseError;
                        }
                    }
                }
            }

            setAnalyzeProgress({
                phase: 'analyzing',
                fetchProgress: { current: datapoints.length, total: datapoints.length, property: '', status: 'complete' }
            });

            const analyzeResponse = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyResults })
            });

            const analyzeReader = analyzeResponse.body?.getReader();
            if (!analyzeReader) throw new Error('Failed to get analyze reader');

            let analyzeBuffer = '';
            let analyses: PropertyAnalysis[] = [];

            while (true) {
                const { done, value } = await analyzeReader.read();
                if (done) break;

                analyzeBuffer += decoder.decode(value, { stream: true });
                const lines = analyzeBuffer.split('\n\n');
                analyzeBuffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const { event, data } = JSON.parse(line.slice(6));

                            if (event === 'progress') {
                                setAnalyzeProgress(prev => ({
                                    ...prev,
                                    phase: 'analyzing',
                                    analyzeProgress: {
                                        current: data.current,
                                        total: data.total,
                                        property: data.property
                                    }
                                }));
                            } else if (event === 'property_analyzed') {
                                setAnalyzeProgress(prev => ({
                                    ...prev,
                                    analyzeProgress: {
                                        current: data.current,
                                        total: data.total,
                                        property: data.property
                                    }
                                }));
                            } else if (event === 'complete') {
                                analyses = data.analyses;
                            } else if (event === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (parseError) {
                            if (parseError instanceof SyntaxError) continue;
                            throw parseError;
                        }
                    }
                }
            }

            setAnalyzeProgress({ phase: 'complete' });
            setAnalyzeResult({ analyses, fundId: id });

        } catch (error) {
            setAnalyzeProgress({
                phase: 'error',
                error: error instanceof Error ? error.message : 'Analysis failed'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendChatMessage = async (content: string) => {
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, userMessage]);
        setIsChatLoading(true);

        const messagesForApi = [...chatMessages, userMessage].map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesForApi,
                    context: jsonReference?.value
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <main className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
            <aside className="w-80 border-r border-zinc-800 flex flex-col p-4 bg-zinc-950 shrink-0">
                <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <Database className="w-6 h-6 text-emerald-500" />
                        <h1 className="text-xl font-bold tracking-tight text-white">DataManager</h1>
                    </div>
                    <button
                        onClick={() => setIsAnalyzeModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        title="Lipper Analyze"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze
                    </button>
                </div>
                <ApiCatalog
                    apis={apis}
                    onSelect={handleAddTab}
                    selectedId={activeTab?.api.id}
                />
            </aside>

            <section className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                <div className="flex items-end px-2 pt-2 gap-1 border-b border-zinc-800 bg-zinc-950">
                    <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-t-md text-xs font-medium cursor-pointer border-t border-l border-r transition-colors min-w-[140px] max-w-[200px] h-9 shrink-0",
                                    activeTabId === tab.id
                                        ? "bg-zinc-900 border-zinc-700 text-white"
                                        : "bg-zinc-950 border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] px-1 rounded font-bold shrink-0",
                                    tab.api.method === 'GET' ? "bg-blue-500/20 text-blue-400" :
                                        tab.api.method === 'POST' ? "bg-emerald-500/20 text-emerald-400" :
                                            "bg-zinc-700 text-zinc-300"
                                )}>
                                    {tab.api.method}
                                </span>
                                <span className="truncate flex-1">{tab.api.name}</span>
                                <button
                                    onClick={(e) => handleCloseTab(e, tab.id)}
                                    className="p-0.5 rounded-full hover:bg-zinc-700 text-zinc-500 hover:text-white shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {tabs.length > 0 && (
                        <button
                            onClick={() => {
                                setTabs([]);
                                setActiveTabId(null);
                            }}
                            className="mb-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors shrink-0"
                            title="Close All Tabs"
                        >
                            Close All
                        </button>
                    )}
                </div>


                <div className="flex-1 overflow-auto bg-zinc-900/30">
                    {activeTab ? (
                        <div className="flex h-full p-6 gap-6">
                            <div className="w-[450px] flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
                                <Card className="p-5 bg-zinc-900 border-zinc-800 shadow-xl">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-semibold mb-1 text-white">{activeTab.api.name}</h2>
                                        <p className="text-sm text-zinc-400 leading-relaxed font-mono text-[11px] break-all">
                                            {activeTab.api.endpoint}
                                        </p>
                                        <p className="text-sm text-zinc-400 mt-2">{activeTab.api.description}</p>
                                    </div>
                                    <div className="border-t border-zinc-800 pt-4">
                                        <ParameterForm
                                            key={activeTab.id}
                                            parameters={activeTab.api.parameters}
                                            onSubmit={handleCallApi}
                                            isLoading={activeTab.isLoading}
                                        />
                                    </div>
                                </Card>
                            </div>

                            <div className="flex-1 flex flex-col min-w-0 h-full">
                                <div className="flex flex-col gap-2 mb-2 px-1 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono uppercase text-zinc-400 font-bold">Response Data</span>
                                        {!!activeTab.result && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleAnalyze}
                                                    disabled={isAnalyzing}
                                                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium disabled:opacity-50"
                                                    title="Analyze JSON Structure"
                                                >
                                                    {isAnalyzing ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3 h-3" />
                                                    )}
                                                    {isAnalyzing ? 'ANALYZING...' : 'ANALYZE'}
                                                </button>
                                                <button
                                                    onClick={handleDownloadJson}
                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors"
                                                    title="Download JSON"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    DOWNLOAD
                                                </button>
                                                <button
                                                    onClick={() => updateActiveTab({ result: null })}
                                                    className="text-[11px] text-zinc-500 hover:text-white transition-colors underline"
                                                >
                                                    CLEAR OUTPUT
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {activeTab.executedUrl && (
                                        <div className="bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0",
                                                activeTab.api.method === 'GET' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                            )}>
                                                {activeTab.api.method}
                                            </span>
                                            <Input
                                                value={activeTab.editableUrl}
                                                onChange={(e) => updateActiveTab({ editableUrl: e.target.value })}
                                                className="flex-1 bg-zinc-950 border-zinc-700 text-xs font-mono text-zinc-300 h-8 px-2"
                                                placeholder="Edit URL and press execute..."
                                            />
                                            <Button
                                                onClick={handleExecuteFromUrl}
                                                disabled={activeTab.isLoading || !activeTab.editableUrl}
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-3 shrink-0"
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                Execute
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 rounded-lg border border-zinc-800 bg-[#0d0d0d] overflow-hidden shadow-inner h-full">
                                    {isAnalyzing ? (
                                        <AnalysisProgress progress={analysisProgress} />
                                    ) : analysisResults && analysisStats ? (
                                        <AnalysisTable
                                            results={analysisResults}
                                            stats={analysisStats}
                                            onClose={handleCloseAnalysis}
                                        />
                                    ) : (
                                        <JsonViewer
                                            data={activeTab.result}
                                            onSelectionChange={handleJsonSelection}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                                <Zap className="w-8 h-8 text-zinc-700" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-zinc-300 mb-1">No Active Tab</h3>
                                <p className="text-sm">Select an API from the left sidebar to get started</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className={cn(
                        "fixed bottom-6 right-6 z-40",
                        "w-14 h-14 rounded-full",
                        "bg-emerald-600 hover:bg-emerald-500",
                        "shadow-lg shadow-emerald-600/20",
                        "flex items-center justify-center",
                        "transition-all duration-200",
                        "hover:scale-105 active:scale-95"
                    )}
                    title="Open Agent Chat"
                >
                    <MessageSquare className="w-6 h-6 text-white" />
                </button>
            )}

            <AgentChat
                isOpen={isChatOpen}
                onOpenChange={setIsChatOpen}
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                isLoading={isChatLoading}
                jsonReference={jsonReference}
                onClearReference={() => setJsonReference(null)}
            />

            <LipperAnalyzeModal
                isOpen={isAnalyzeModalOpen}
                onClose={() => setIsAnalyzeModalOpen(false)}
                onStart={handleStartAnalyze}
                isLoading={isAnalyzing}
            />

            {isAnalyzing && analyzeProgress.phase !== 'idle' && (
                <AnalyzeProgress progress={analyzeProgress} />
            )}

            {analyzeResult && (
                <AnalyzeReport
                    analyses={analyzeResult.analyses}
                    fundId={analyzeResult.fundId}
                    onClose={() => setAnalyzeResult(null)}
                />
            )}
        </main>
    );
}
