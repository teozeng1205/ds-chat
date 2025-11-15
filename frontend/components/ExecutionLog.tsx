'use client';

import React, { useEffect, useRef } from 'react';
import { ExecutionLog } from '@/lib/api';
import { AlertCircle, Info, AlertTriangle, MessageSquare } from 'lucide-react';

interface ExecutionLogProps {
  logs: ExecutionLog[];
}

export default function ExecutionLogComponent({ logs }: ExecutionLogProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle size={16} className="flex-shrink-0" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="flex-shrink-0" />;
      case 'INFO':
        return <Info size={16} className="flex-shrink-0" />;
      default:
        return <MessageSquare size={16} className="flex-shrink-0" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          text: 'text-destructive',
          icon: 'text-destructive',
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-600 dark:text-yellow-400',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'INFO':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-600 dark:text-blue-400',
          icon: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          bg: 'bg-secondary',
          border: 'border-border',
          text: 'text-muted-foreground',
          icon: 'text-muted-foreground',
        };
    }
  };

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <h2 className="font-semibold text-sm">Execution Logs</h2>
        <p className="text-xs text-muted-foreground">Agent operations and events</p>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center py-8">
            <p className="text-xs text-muted-foreground">No logs yet. Send a message to see execution details.</p>
          </div>
        ) : (
          <>
            {logs.map((log, idx) => {
              const colors = getLogColor(log.level);
              return (
                <div
                  key={idx}
                  className={`rounded-md border p-3 text-xs space-y-1 ${colors.bg} ${colors.border} border`}
                >
                  <div className="flex items-start gap-2">
                    <div className={colors.icon}>{getLogIcon(log.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${colors.text}`}>{log.level}</span>
                        <span className="text-muted-foreground">[{log.source}]</span>
                      </div>
                      <p className="text-muted-foreground break-words">{log.message}</p>
                      <p className="text-muted-foreground/60 mt-1">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
