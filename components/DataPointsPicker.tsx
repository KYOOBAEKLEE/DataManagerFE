"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search } from 'lucide-react';

interface DataPointsPickerProps {
    onApply: (selectedValues: string) => void;
    currentValue?: string;
}

interface DataPoint {
    name: string;
    description?: string;
    // Add other fields if necessary based on API response
}

export const DataPointsPicker: React.FC<DataPointsPickerProps> = ({ onApply, currentValue }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open && dataPoints.length === 0) {
            fetchDataPoints();
        }
    }, [open]);

    // Initialize selected from currently entered value string
    useEffect(() => {
        if (open && currentValue) {
            const initialSet = new Set(
                currentValue.split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            setSelected(initialSet);
        }
    }, [open, currentValue]);

    const fetchDataPoints = async () => {
        setLoading(true);
        try {
            // Call the proxy endpoint
            const response = await fetch('http://localhost:3001/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiId: 'lipper-ref-datapoints',
                    category: 'Lipper',
                    method: 'GET',
                    endpoint: '/data/funds/v1/assets/ref/datapoints'
                })
            });
            const data = await response.json();

            // Assume the response is an array of objects or inside a property.
            // Based on user request "datapoints에서 조회한 내용 중 name 키의 값들"
            // We'll check if it's an array directly or nested.
            // Common Refinitiv pattern is { value: [...] } or just [...]
            let items: DataPoint[] = [];

            if (data && Array.isArray(data.properties)) {
                // Extract top-level category names as requested
                items = data.properties.map((prop: any) => ({
                    name: prop.name,
                    description: `${prop.dataPoints?.length || 0} data points`
                }));
            } else if (Array.isArray(data)) {
                items = data;
            } else if (data && Array.isArray(data.value)) {
                items = data.value;
            } else if (data && Array.isArray(data.dataPoints)) {
                items = data.dataPoints;
            } else {
                console.warn("Unexpected DataPoints API structure:", data);
            }

            // Ensure items have 'name' property
            if (items.length > 0 && !items[0].name) {
                // If no 'name', maybe it's just strings?
                // Or maybe different key.
                // Re-mapping if needed.
                // User explicitly said "name 키의 값들" so we assume it exists.
            }

            setDataPoints(items);

        } catch (error) {
            console.error("Failed to fetch data points:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPoints = dataPoints.filter(dp =>
        dp.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelection = (name: string) => {
        const newSet = new Set(selected);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setSelected(newSet);
    };

    const handleApply = () => {
        const joined = Array.from(selected).join(',');
        onApply(joined);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white text-xs">
                    Select Data Points
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-[600px]">
                <DialogHeader className="p-4 border-b border-zinc-800">
                    <DialogTitle>Select Data Points</DialogTitle>
                </DialogHeader>

                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 px-1 shrink-0">
                        <Checkbox
                            id="select-all"
                            checked={filteredPoints.length > 0 && filteredPoints.every(p => selected.has(p.name))}
                            onCheckedChange={(checked) => {
                                const newSet = new Set(selected);
                                filteredPoints.forEach(p => {
                                    if (checked) newSet.add(p.name);
                                    else newSet.delete(p.name);
                                });
                                setSelected(newSet);
                            }}
                            className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <Label htmlFor="select-all" className="text-xs text-zinc-400 cursor-pointer whitespace-nowrap font-medium">
                            Select All
                        </Label>
                    </div>
                    <div className="relative flex-1 max-w-[360px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search categories..."
                            className="bg-zinc-950 border-zinc-700 pl-9 text-xs h-9 focus-visible:ring-emerald-600"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex h-[400px] items-center justify-center gap-2 text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] p-4">
                            <div className="flex flex-col gap-2">
                                {filteredPoints.length === 0 ? (
                                    <div className="text-center text-zinc-500 py-8 text-sm">
                                        No data points found.
                                    </div>
                                ) : (
                                    filteredPoints.map((dp, idx) => (
                                        <div key={idx} className="flex items-center space-x-2 py-1">
                                            <Checkbox
                                                id={`dp-${idx}`}
                                                checked={selected.has(dp.name)}
                                                onCheckedChange={() => toggleSelection(dp.name)}
                                                className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                            />
                                            <Label
                                                htmlFor={`dp-${idx}`}
                                                className="text-sm cursor-pointer select-none text-zinc-300 flex-1"
                                            >
                                                {dp.name}
                                                {dp.description && (
                                                    <span className="ml-2 text-xs text-zinc-500 truncate">
                                                        - {dp.description}
                                                    </span>
                                                )}
                                            </Label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 w-full flex items-center justify-between mt-auto">
                    <span className="text-xs text-zinc-500">
                        {selected.size} selected
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpen(false)}
                            className="hover:bg-zinc-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApply}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            Apply Selection
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
