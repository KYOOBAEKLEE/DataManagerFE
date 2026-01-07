"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataPointsPicker } from '@/components/DataPointsPicker';

interface Parameter {
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: unknown;
    options?: string[];
}

interface ParameterFormProps {
    parameters: Parameter[];
    onSubmit: (values: Record<string, unknown>) => void;
    isLoading?: boolean;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({ parameters, onSubmit, isLoading }) => {
    const [values, setValues] = React.useState<Record<string, unknown>>(() => {
        const initialValues: Record<string, unknown> = {};
        parameters.forEach(param => {
            initialValues[param.name] = param.default || '';
        });
        return initialValues;
    });

    const handleChange = (name: string, value: string) => {
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(values);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5">
                {parameters.map((param) => (
                    <div key={param.name} className="flex flex-col gap-2 relative">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={param.name} className="flex items-center gap-1 text-zinc-300 font-medium">
                                {param.name}
                                {param.required && <span className="text-red-400">*</span>}
                            </Label>
                            {param.name === 'properties' && (
                                <DataPointsPicker
                                    currentValue={(values[param.name] as string) || ''}
                                    onApply={(val) => handleChange(param.name, val)}
                                />
                            )}
                        </div>

                        {param.type === 'json' ? (
                            <Textarea
                                id={param.name}
                                placeholder={param.description}
                                required={param.required}
                                className="bg-zinc-950 border-zinc-700 font-mono text-xs min-h-[150px] text-zinc-100 placeholder:text-zinc-600"
                                value={(values[param.name] as string) || ''}
                                onChange={(e) => handleChange(param.name, e.target.value)}
                            />
                        ) : param.type === 'select' ? (
                            <Select
                                onValueChange={(val) => handleChange(param.name, val)}
                                value={(values[param.name] as string) || ''}
                            >
                                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-100">
                                    <SelectValue placeholder={`Select ${param.name}`} />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                    {param.options?.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id={param.name}
                                placeholder={param.description}
                                type={param.type === 'number' ? 'number' : 'text'}
                                required={param.required}
                                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                                value={(values[param.name] as string) || ''}
                                onChange={(e) => handleChange(param.name, e.target.value)}
                            />
                        )}
                        {param.type === 'json' && (
                            <p className="text-[10px] text-zinc-400">
                                Enter valid JSON. Use the default template as a guide.
                            </p>
                        )}
                    </div>
                ))}
            </div>
            <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2 font-semibold"
                disabled={isLoading}
            >
                {isLoading ? 'Executing Request...' : 'Run API Call'}
            </Button>
        </form>
    );
};
