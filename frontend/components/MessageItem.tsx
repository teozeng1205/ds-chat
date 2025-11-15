'use client';

import React from 'react';
import { Message } from '@/lib/api';
import { User, Bot } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  // Simple markdown rendering
  const renderContent = (content: string) => {
    // Handle code blocks
    const parts = content.split(/```([^`]*?)```/g);

    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        // Code block
        return (
          <pre key={idx} className="bg-black dark:bg-gray-900 text-white dark:text-gray-100 rounded-lg p-3 overflow-x-auto text-sm font-mono my-2">
            <code>{part.trim()}</code>
          </pre>
        );
      }

      // Regular text with markdown formatting
      return (
        <div key={idx}>
          {part.split('\n').map((line, lineIdx) => {
            if (!line.trim()) return <br key={lineIdx} />;

            // Bold
            let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Italic
            formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
            // Links
            formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

            return (
              <p
                key={lineIdx}
                dangerouslySetInnerHTML={{ __html: formatted }}
                className="leading-relaxed my-1"
              />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-secondary text-secondary-foreground'
      }`}>
        {isUser ? (
          <User size={16} />
        ) : (
          <span className="text-sm">🤖</span>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`p-3 rounded-lg max-w-[80%] break-words ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground border border-border'
        }`}>
          <div className="text-sm leading-relaxed">
            {renderContent(message.content)}
          </div>
        </div>
      </div>
    </div>
  );
}
