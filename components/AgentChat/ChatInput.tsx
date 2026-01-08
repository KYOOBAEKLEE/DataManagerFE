"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    
    onSend(trimmed);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 p-4 bg-zinc-950 shrink-0">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent..."
          disabled={isLoading || disabled}
          className={cn(
            "flex-1 min-h-[44px] max-h-[120px] resize-none",
            "bg-zinc-900 border-zinc-700 text-zinc-100",
            "placeholder:text-zinc-500",
            "focus:border-emerald-600 focus:ring-emerald-600/20"
          )}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className="bg-emerald-600 hover:bg-emerald-500 text-white h-[44px] w-[44px] p-0 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-[10px] text-zinc-600 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
