"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface ApiMetadata {
    id: string;
    name: string;
    category: string;
    description: string;
    endpoint: string;
    method: string;
    parameters: { name: string; type: string; required: boolean; description: string; default?: unknown; options?: string[] }[];
}

interface ApiCatalogProps {
    apis: ApiMetadata[];
    onSelect: (api: ApiMetadata) => void;
    selectedId?: string;
}

export const ApiCatalog: React.FC<ApiCatalogProps> = ({ apis, onSelect, selectedId }) => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Get unique categories from APIs or use predefined list
    // Ideally dynamic, but user specifically asked for "Lipper" prompt first
    const categories = ['Lipper'];

    const filteredApis = apis.filter(api => {
        const matchesSearch = api.name.toLowerCase().includes(search.toLowerCase()) ||
            api.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory ? api.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                        placeholder="Search APIs..."
                        className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border transition-colors whitespace-nowrap ${selectedCategory === null
                                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                            }`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                            className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border transition-colors whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="flex flex-col gap-2">
                    {filteredApis.map((api) => (
                        <Card
                            key={api.id}
                            className={`p-3 cursor-pointer transition-colors hover:bg-emerald-500/10 border-zinc-800 hover:border-emerald-500/30 ${selectedId === api.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-900'}`}
                            onClick={() => onSelect(api)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-sm text-zinc-200">{api.name}</h3>
                                <Badge variant="outline" className="text-[10px] uppercase py-0 border-zinc-600 text-zinc-400">{api.category}</Badge>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-2">{api.description}</p>
                        </Card>
                    ))}
                    {filteredApis.length === 0 && (
                        <div className="text-center py-8 text-zinc-500 text-xs italic">
                            No APIs found matching your criteria.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
