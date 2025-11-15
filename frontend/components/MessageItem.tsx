'use client';

import React from 'react';
import { Message } from '@/lib/api';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 rounded-lg ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <User size={18} className="text-primary-foreground" />
        ) : (
          <Bot size={18} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="bg-primary/10 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                  ) : (
                    <code className="block bg-secondary border border-border rounded p-3 overflow-x-auto text-xs font-mono my-2">{children}</code>
                  ),
                pre: ({ children }) => <pre className="bg-secondary border border-border rounded p-3 overflow-x-auto my-2">{children}</pre>,
                table: ({ children }) => <table className="border-collapse border border-border my-2 text-xs">{children}</table>,
                th: ({ children }) => <th className="border border-border px-2 py-1 bg-secondary text-left">{children}</th>,
                td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic my-2 text-muted-foreground">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
