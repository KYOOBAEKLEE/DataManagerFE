import { NextRequest } from 'next/server';
import { flattenWithStats, groupByRoot, FlattenedItem, GroupedItems } from '@/lib/smartFlattener';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

const MAX_RETRIES = 2;
const CHUNK_SIZE = 40;

const SYSTEM_PROMPT = `You are a senior Financial Data Architect. Analyze JSON fields and provide metadata.

CRITICAL RULES:
1. Analyze ALL fields provided - do not skip any
2. Maintain EXACT order of fields
3. Output ONLY valid JSON array, no markdown

For each field provide:
- path: Exact path from input (preserve as-is)
- fieldName: Last part of path
- dataName: Korean name (2-4 words)
- description: Korean description (under 80 chars)
- sampleValue: Sample value from input
- dataType: string|number|boolean|array|object|null
- depth: Nesting level (from input)
- isImportant: true if commonly used for analysis

OUTPUT FORMAT (JSON array only):
[{"path":"...","fieldName":"...","dataName":"...","description":"...","sampleValue":"...","dataType":"...","depth":0,"isImportant":false}]`;

interface AnalysisItem {
    path: string;
    value: string;
    type: string;
    depth: number;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function safeJsonParse(content: string): AnalysisResult[] | null {
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch {
        try {
            let fixed = content
                .replace(/,\s*\]$/, ']')
                .replace(/,\s*}/g, '}')
                .replace(/\n/g, ' ');
            const jsonMatch = fixed.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            return null;
        }
    }
    return null;
}

async function analyzeChunk(
    items: AnalysisItem[],
    context: string,
    chunkInfo: string
): Promise<AnalysisResult[]> {
    if (items.length === 0) return [];

    const userMessage = `Context: ${context}\n${chunkInfo}\nAnalyze these ${items.length} fields:\n${JSON.stringify(items)}`;

    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-5.2-pro-2025-12-11',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.2,
                    max_tokens: 8000,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API error');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '[]';
            
            const results = safeJsonParse(content);
            if (results && results.length > 0) {
                return results.map((r, idx) => ({
                    ...r,
                    depth: items[idx]?.depth ?? r.depth ?? 0
                }));
            }
            
            if (retry < MAX_RETRIES) continue;
            
            return items.map(item => ({
                path: item.path,
                fieldName: item.path.split('.').pop()?.replace('[]', '') || item.path,
                dataName: item.path.split('.').pop()?.replace('[]', '') || item.path,
                description: `${item.type} 타입 필드`,
                sampleValue: item.value,
                dataType: item.type,
                depth: item.depth,
                isImportant: false
            }));
        } catch (error) {
            if (retry >= MAX_RETRIES) {
                console.error(`Chunk analysis failed:`, error);
                return items.map(item => ({
                    path: item.path,
                    fieldName: item.path.split('.').pop()?.replace('[]', '') || item.path,
                    dataName: item.path.split('.').pop()?.replace('[]', '') || item.path,
                    description: `${item.type} 타입 필드`,
                    sampleValue: item.value,
                    dataType: item.type,
                    depth: item.depth,
                    isImportant: false
                }));
            }
        }
    }
    return [];
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
            };

            try {
                const { jsonData } = await request.json();

                if (!jsonData) {
                    sendEvent('error', { message: 'No JSON data provided' });
                    controller.close();
                    return;
                }

                sendEvent('progress', { stage: 'flatten', message: 'Preprocessing JSON structure...' });
                
                const { items, stats } = flattenWithStats(jsonData);
                const groups = groupByRoot(items);
                
                const filteredGroups = groups.map(g => ({
                    ...g,
                    items: g.items.filter(item => !item.path.endsWith('._length'))
                }));

                const totalFields = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);
                
                sendEvent('progress', { 
                    stage: 'flatten_complete', 
                    message: `Found ${totalFields} fields in ${groups.length} sections`,
                    stats,
                    sections: groups.map(g => `${g.rootKey} (${g.items.filter(i => !i.path.endsWith('._length')).length})`)
                });

                let totalChunks = 0;
                for (const group of filteredGroups) {
                    totalChunks += Math.ceil(group.items.length / CHUNK_SIZE);
                }
                
                sendEvent('progress', { 
                    stage: 'analyze_start', 
                    message: `Analyzing ${totalFields} fields in ${totalChunks} batches...`,
                    totalGroups: totalChunks
                });

                const allResults: AnalysisResult[] = [];
                let currentChunk = 0;

                for (const group of filteredGroups) {
                    const itemsForAnalysis: AnalysisItem[] = group.items.map(item => ({
                        path: item.path,
                        value: item.value,
                        type: item.type,
                        depth: item.depth
                    }));

                    const chunks = chunkArray(itemsForAnalysis, CHUNK_SIZE);

                    for (let i = 0; i < chunks.length; i++) {
                        currentChunk++;
                        const chunk = chunks[i];
                        const chunkInfo = chunks.length > 1 
                            ? `Section "${group.rootKey}" part ${i + 1}/${chunks.length}`
                            : `Section "${group.rootKey}"`;

                        sendEvent('progress', { 
                            stage: 'analyzing', 
                            message: `${chunkInfo} (${chunk.length} fields)...`,
                            currentSection: group.rootKey,
                            currentGroup: currentChunk,
                            totalGroups: totalChunks
                        });

                        const chunkResults = await analyzeChunk(
                            chunk, 
                            `Financial data API response, section: ${group.rootKey}`,
                            chunkInfo
                        );
                        allResults.push(...chunkResults);

                        sendEvent('progress', { 
                            stage: 'section_complete', 
                            message: `${chunkInfo} complete`,
                            currentSection: group.rootKey,
                            currentGroup: currentChunk,
                            totalGroups: totalChunks,
                            fieldsAnalyzed: allResults.length
                        });
                    }
                }

                sendEvent('complete', {
                    stats: {
                        ...stats,
                        flattenedCount: totalFields
                    },
                    results: allResults
                });

            } catch (error) {
                sendEvent('error', { 
                    message: error instanceof Error ? error.message : 'Analysis failed' 
                });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
