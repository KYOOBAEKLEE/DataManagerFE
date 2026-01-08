"use client";

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 px-4 py-2",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-emerald-600" : "bg-zinc-800 border border-zinc-700"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2",
        isUser 
          ? "bg-emerald-600 text-white" 
          : "bg-zinc-900 text-zinc-100 border border-zinc-800"
      )}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        <span className={cn(
          "text-[10px] mt-1 block",
          isUser ? "text-emerald-200" : "text-zinc-500"
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
