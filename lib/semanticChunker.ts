export interface SemanticChunk {
    id: string;
    type: 'root' | 'array_item' | 'object_group' | 'field_group';
    path: string;
    name: string;
    description: string;
    data: unknown;
    fields: string[];
    size: number;
    depth: number;
    parentId?: string;
    metadata: {
        arrayIndex?: number;
        arrayLength?: number;
        fieldCount: number;
        hasNestedObjects: boolean;
        hasNestedArrays: boolean;
    };
}

export interface ChunkingResult {
    chunks: SemanticChunk[];
    schema: SchemaInfo;
    stats: {
        totalChunks: number;
        totalFields: number;
        maxDepth: number;
        originalSize: number;
        processedSize: number;
    };
}

export interface SchemaInfo {
    rootType: string;
    structure: SchemaNode[];
    topLevelKeys: string[];
    arrayPaths: string[];
    objectPaths: string[];
}

export interface SchemaNode {
    path: string;
    name: string;
    type: string;
    isArray: boolean;
    isObject: boolean;
    childCount?: number;
    sampleValue?: unknown;
    children?: SchemaNode[];
}

const SKIP_FIELDS = ['_links', '_embedded', 'links', 'meta', '@odata'];
const MAX_CHUNK_SIZE = 4000;

function getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function estimateSize(data: unknown): number {
    return JSON.stringify(data).length;
}

function shouldSkipField(key: string): boolean {
    return SKIP_FIELDS.some(skip => 
        key.toLowerCase().includes(skip.toLowerCase())
    );
}

function extractSchema(data: unknown, path: string = '', depth: number = 0): SchemaNode[] {
    const nodes: SchemaNode[] = [];
    
    if (data === null || data === undefined) return nodes;
    
    if (Array.isArray(data)) {
        const node: SchemaNode = {
            path: path || 'root',
            name: path.split('.').pop() || 'root',
            type: 'array',
            isArray: true,
            isObject: false,
            childCount: data.length,
            sampleValue: data.length > 0 ? `[${data.length} items]` : '[]'
        };
        
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
            node.children = extractSchema(data[0], `${path}[]`, depth + 1);
        }
        
        nodes.push(node);
    } else if (typeof data === 'object') {
        const entries = Object.entries(data as Record<string, unknown>);
        
        for (const [key, value] of entries) {
            if (shouldSkipField(key)) continue;
            
            const fieldPath = path ? `${path}.${key}` : key;
            const valueType = getType(value);
            
            const node: SchemaNode = {
                path: fieldPath,
                name: key,
                type: valueType,
                isArray: valueType === 'array',
                isObject: valueType === 'object',
            };
            
            if (valueType === 'array' && Array.isArray(value)) {
                node.childCount = value.length;
                node.sampleValue = `[${value.length} items]`;
                if (value.length > 0 && typeof value[0] === 'object') {
                    node.children = extractSchema(value[0], `${fieldPath}[]`, depth + 1);
                }
            } else if (valueType === 'object' && value !== null) {
                node.children = extractSchema(value, fieldPath, depth + 1);
                node.childCount = Object.keys(value as object).length;
            } else {
                node.sampleValue = value;
            }
            
            nodes.push(node);
        }
    }
    
    return nodes;
}

function getFieldPaths(data: unknown, parentPath: string = ''): string[] {
    const paths: string[] = [];
    
    if (data === null || data === undefined) return paths;
    
    if (Array.isArray(data)) {
        if (data.length > 0) {
            paths.push(...getFieldPaths(data[0], `${parentPath}[]`));
        }
    } else if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (shouldSkipField(key)) continue;
            
            const fieldPath = parentPath ? `${parentPath}.${key}` : key;
            paths.push(fieldPath);
            
            if (typeof value === 'object' && value !== null) {
                paths.push(...getFieldPaths(value, fieldPath));
            }
        }
    }
    
    return paths;
}

function createChunk(
    id: string,
    type: SemanticChunk['type'],
    path: string,
    name: string,
    data: unknown,
    depth: number,
    parentId?: string,
    arrayIndex?: number,
    arrayLength?: number
): SemanticChunk {
    const fields = getFieldPaths(data);
    const hasNestedObjects = typeof data === 'object' && data !== null &&
        Object.values(data as object).some(v => typeof v === 'object' && v !== null && !Array.isArray(v));
    const hasNestedArrays = typeof data === 'object' && data !== null &&
        Object.values(data as object).some(v => Array.isArray(v));
    
    return {
        id,
        type,
        path,
        name,
        description: generateChunkDescription(type, name, fields.length, arrayIndex, arrayLength),
        data: cleanData(data),
        fields,
        size: estimateSize(data),
        depth,
        parentId,
        metadata: {
            arrayIndex,
            arrayLength,
            fieldCount: fields.length,
            hasNestedObjects,
            hasNestedArrays
        }
    };
}

function generateChunkDescription(
    type: SemanticChunk['type'],
    name: string,
    fieldCount: number,
    arrayIndex?: number,
    arrayLength?: number
): string {
    switch (type) {
        case 'root':
            return `루트 객체 (${fieldCount}개 필드)`;
        case 'array_item':
            return `${name} 배열의 ${arrayIndex! + 1}번째 항목 (전체 ${arrayLength}개 중)`;
        case 'object_group':
            return `${name} 객체 그룹 (${fieldCount}개 필드)`;
        case 'field_group':
            return `${name} 관련 필드 그룹`;
        default:
            return name;
    }
}

function cleanData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    
    if (Array.isArray(data)) {
        return data.map(item => cleanData(item));
    }
    
    if (typeof data === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (shouldSkipField(key)) continue;
            cleaned[key] = cleanData(value);
        }
        return cleaned;
    }
    
    return data;
}

function splitLargeChunk(chunk: SemanticChunk, maxSize: number): SemanticChunk[] {
    if (chunk.size <= maxSize) return [chunk];
    
    const data = chunk.data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) return [chunk];
    
    const entries = Object.entries(data);
    const subChunks: SemanticChunk[] = [];
    let currentGroup: Record<string, unknown> = {};
    let currentSize = 0;
    let groupIndex = 0;
    
    for (const [key, value] of entries) {
        const entrySize = estimateSize({ [key]: value });
        
        if (currentSize + entrySize > maxSize && Object.keys(currentGroup).length > 0) {
            subChunks.push(createChunk(
                `${chunk.id}_part${groupIndex}`,
                'field_group',
                `${chunk.path}.part${groupIndex}`,
                `${chunk.name} (파트 ${groupIndex + 1})`,
                currentGroup,
                chunk.depth,
                chunk.id
            ));
            currentGroup = {};
            currentSize = 0;
            groupIndex++;
        }
        
        currentGroup[key] = value;
        currentSize += entrySize;
    }
    
    if (Object.keys(currentGroup).length > 0) {
        subChunks.push(createChunk(
            `${chunk.id}_part${groupIndex}`,
            'field_group',
            `${chunk.path}.part${groupIndex}`,
            `${chunk.name} (파트 ${groupIndex + 1})`,
            currentGroup,
            chunk.depth,
            chunk.id
        ));
    }
    
    return subChunks;
}

export function semanticChunk(data: unknown): ChunkingResult {
    const originalSize = estimateSize(data);
    const chunks: SemanticChunk[] = [];
    let chunkIdCounter = 0;
    let maxDepth = 0;
    
    const schema: SchemaInfo = {
        rootType: getType(data),
        structure: extractSchema(data),
        topLevelKeys: [],
        arrayPaths: [],
        objectPaths: []
    };
    
    function processValue(
        value: unknown,
        path: string,
        name: string,
        depth: number,
        parentId?: string
    ): void {
        maxDepth = Math.max(maxDepth, depth);
        
        if (value === null || value === undefined) return;
        
        if (Array.isArray(value)) {
            schema.arrayPaths.push(path);
            
            const arrayLength = value.length;
            const sampleSize = Math.min(arrayLength, 3);
            
            for (let i = 0; i < sampleSize; i++) {
                const item = value[i];
                if (typeof item === 'object' && item !== null) {
                    const itemId = `chunk_${chunkIdCounter++}`;
                    const itemChunk = createChunk(
                        itemId,
                        'array_item',
                        `${path}[${i}]`,
                        name,
                        item,
                        depth,
                        parentId,
                        i,
                        arrayLength
                    );
                    
                    const splitChunks = splitLargeChunk(itemChunk, MAX_CHUNK_SIZE);
                    chunks.push(...splitChunks);
                    
                    for (const [key, subValue] of Object.entries(item as Record<string, unknown>)) {
                        if (shouldSkipField(key)) continue;
                        if (typeof subValue === 'object' && subValue !== null) {
                            processValue(subValue, `${path}[${i}].${key}`, key, depth + 1, itemId);
                        }
                    }
                }
            }
        } else if (typeof value === 'object') {
            schema.objectPaths.push(path);
            
            if (depth === 0) {
                schema.topLevelKeys = Object.keys(value as object).filter(k => !shouldSkipField(k));
            }
            
            const objId = `chunk_${chunkIdCounter++}`;
            const objChunk = createChunk(
                objId,
                depth === 0 ? 'root' : 'object_group',
                path,
                name,
                value,
                depth,
                parentId
            );
            
            if (depth === 0 || objChunk.size > MAX_CHUNK_SIZE / 2) {
                const splitChunks = splitLargeChunk(objChunk, MAX_CHUNK_SIZE);
                chunks.push(...splitChunks);
            } else {
                chunks.push(objChunk);
            }
            
            for (const [key, subValue] of Object.entries(value as Record<string, unknown>)) {
                if (shouldSkipField(key)) continue;
                if (Array.isArray(subValue) || (typeof subValue === 'object' && subValue !== null)) {
                    processValue(subValue, path ? `${path}.${key}` : key, key, depth + 1, objId);
                }
            }
        }
    }
    
    processValue(data, '', 'root', 0);
    
    const processedSize = chunks.reduce((sum, c) => sum + c.size, 0);
    const totalFields = chunks.reduce((sum, c) => sum + c.metadata.fieldCount, 0);
    
    return {
        chunks,
        schema,
        stats: {
            totalChunks: chunks.length,
            totalFields,
            maxDepth,
            originalSize,
            processedSize
        }
    };
}

export function getSchemaOverview(schema: SchemaInfo): string {
    const lines: string[] = [];
    
    lines.push(`Root Type: ${schema.rootType}`);
    lines.push(`Top-level Keys: ${schema.topLevelKeys.join(', ')}`);
    
    if (schema.arrayPaths.length > 0) {
        lines.push(`Arrays: ${schema.arrayPaths.slice(0, 5).join(', ')}${schema.arrayPaths.length > 5 ? '...' : ''}`);
    }
    
    function printNode(node: SchemaNode, indent: number = 0): void {
        const prefix = '  '.repeat(indent);
        const typeStr = node.isArray ? `array[${node.childCount}]` : 
                       node.isObject ? `object{${node.childCount}}` : 
                       node.type;
        lines.push(`${prefix}- ${node.name}: ${typeStr}`);
        
        if (node.children && indent < 2) {
            node.children.slice(0, 5).forEach(child => printNode(child, indent + 1));
            if (node.children.length > 5) {
                lines.push(`${prefix}  ... and ${node.children.length - 5} more`);
            }
        }
    }
    
    lines.push('\nStructure:');
    schema.structure.slice(0, 10).forEach(node => printNode(node));
    
    return lines.join('\n');
}
