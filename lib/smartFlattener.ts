export interface FlattenedItem {
    path: string;
    value: string;
    type: string;
    depth: number;
    isArrayItem: boolean;
}

export interface FlattenResult {
    items: FlattenedItem[];
    stats: {
        originalSize: number;
        flattenedCount: number;
        compressionRatio: string;
    };
}

export interface GroupedItems {
    rootKey: string;
    items: FlattenedItem[];
}

const MAX_VALUE_LENGTH = 100;

function truncateValue(value: string): string {
    return value.length > MAX_VALUE_LENGTH 
        ? value.substring(0, MAX_VALUE_LENGTH) + '...' 
        : value;
}

function getDepth(path: string): number {
    return (path.match(/\./g) || []).length;
}

function createItem(path: string, value: string, type: string): FlattenedItem {
    const isArrayItem = path.includes('[');
    return { 
        path: path || 'root', 
        value, 
        type,
        depth: getDepth(path),
        isArrayItem
    };
}

export function smartFlatten(
    data: unknown,
    parentKey: string = '',
    sep: string = '.'
): FlattenedItem[] {
    if (data === null) {
        return [createItem(parentKey, 'null', 'null')];
    }

    if (Array.isArray(data)) {
        return flattenArray(data, parentKey, sep);
    }

    if (typeof data === 'object') {
        return flattenObject(data as Record<string, unknown>, parentKey, sep);
    }

    return [createItem(parentKey, truncateValue(String(data)), typeof data)];
}

function flattenObject(
    obj: Record<string, unknown>,
    parentKey: string,
    sep: string
): FlattenedItem[] {
    const items: FlattenedItem[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const newKey = parentKey ? `${parentKey}${sep}${key}` : key;
        items.push(...smartFlatten(value, newKey, sep));
    }
    
    return items;
}

function flattenArray(
    arr: unknown[],
    parentKey: string,
    sep: string
): FlattenedItem[] {
    if (arr.length === 0) {
        return [createItem(parentKey, '[]', 'emptyArray')];
    }

    const items = smartFlatten(arr[0], `${parentKey}[]`, sep);
    items.push(createItem(`${parentKey}._length`, String(arr.length), 'meta'));
    
    return items;
}

export function flattenWithStats(data: unknown): FlattenResult {
    const originalSize = JSON.stringify(data).length;
    const items = smartFlatten(data);
    const flattenedSize = JSON.stringify(items).length;

    return {
        items,
        stats: {
            originalSize,
            flattenedCount: items.length,
            compressionRatio: ((1 - flattenedSize / originalSize) * 100).toFixed(1) + '%'
        }
    };
}

export function groupByRoot(items: FlattenedItem[]): GroupedItems[] {
    const groups: Map<string, FlattenedItem[]> = new Map();

    for (const item of items) {
        const rootKey = item.path.split('.')[0].split('[')[0];
        if (!groups.has(rootKey)) {
            groups.set(rootKey, []);
        }
        groups.get(rootKey)!.push(item);
    }

    return Array.from(groups.entries()).map(([rootKey, groupItems]) => ({
        rootKey,
        items: groupItems
    }));
}

export function formatPathForDisplay(path: string): string {
    return path
        .replace(/\[\]/g, '')
        .replace(/\._length$/, '');
}

export function getFieldName(path: string): string {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\[\]$/, '').replace(/^_/, '');
}
