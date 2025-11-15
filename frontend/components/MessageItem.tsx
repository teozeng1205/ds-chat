'use client';

import React from 'react';
import { Message } from '@/lib/api';
import styles from './MessageItem.module.css';
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
          <pre key={idx} className={styles.codeBlock}>
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
            formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

            return (
              <p
                key={lineIdx}
                dangerouslySetInnerHTML={{ __html: formatted }}
                className={styles.paragraph}
              />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className={`${styles.messageWrapper} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.messageContent}>
        {!isUser && <Bot size={16} className={styles.icon} />}
        {isUser && <User size={16} className={styles.icon} />}
        <div className={styles.text}>{renderContent(message.content)}</div>
      </div>
    </div>
  );
}
