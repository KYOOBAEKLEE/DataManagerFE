"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './ChatInput';
import { Bot, X, GripVertical, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface JsonReference {
  path: string;
  value: unknown;
}

interface AgentChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  jsonReference?: JsonReference | null;
  onClearReference?: () => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 1400;
const DEFAULT_WIDTH = 420;

export function AgentChat({
  isOpen,
  onOpenChange,
  messages,
  onSendMessage,
  isLoading,
  jsonReference,
  onClearReference
}: AgentChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <div
      className="h-full border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 relative"
      style={{ width }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500/50 transition-colors z-10 group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-zinc-500" />
        </div>
      </div>

      <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="font-medium">Agent Assistant</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {jsonReference && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-emerald-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 min-w-0">
              <Link2 className="w-3 h-3 shrink-0" />
              <span className="truncate font-mono">{jsonReference.path}</span>
            </div>
            <button
              onClick={onClearReference}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <pre className="mt-1 text-[10px] text-zinc-400 max-h-20 overflow-auto bg-zinc-900/50 rounded p-1.5 font-mono">
            {typeof jsonReference.value === 'string' 
              ? jsonReference.value 
              : JSON.stringify(jsonReference.value, null, 2)}
          </pre>
        </div>
      )}

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="py-4 px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500">
              <Bot className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm">Start a conversation</p>
              <p className="text-xs text-zinc-600 mt-1">
                Ask questions about your data or APIs
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {message.role === 'user' ? (
                      <span className="text-xs font-medium text-zinc-400">You</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-400">Assistant</span>
                    )}
                    <span className="text-[10px] text-zinc-600">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={cn(
                    "prose prose-sm prose-invert max-w-none py-2",
                    "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1",
                    "prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:overflow-x-auto",
                    "prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
                    message.role === 'user' && "text-zinc-300"
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="mt-4 space-y-1">
              <span className="text-xs font-medium text-emerald-400">Assistant</span>
              <div className="flex gap-1 py-2">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
