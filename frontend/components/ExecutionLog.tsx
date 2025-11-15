'use client';

import React, { useEffect, useRef } from 'react';
import { ExecutionLog } from '@/lib/api';
import { AlertCircle, Info, CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react';

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

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 dark:text-red-400';
      case 'WARNING':
        return 'text-amber-600 dark:text-amber-400';
      case 'INFO':
        return 'text-blue-600 dark:text-blue-400';
      case 'SUCCESS':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50';
      case 'WARNING':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50';
      case 'INFO':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50';
      case 'SUCCESS':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-900/50';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle size={16} />;
      case 'WARNING':
        return <AlertTriangle size={16} />;
      case 'SUCCESS':
        return <CheckCircle size={16} />;
      case 'INFO':
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full overflow-hidden shadow-lg">
      {/* Header */}
      <div className="border-b border-border p-4 bg-background sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-foreground">Execution Log</h2>
        <p className="text-xs text-muted-foreground mt-1">Agent operations and system events</p>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No logs yet. Send a message to see execution details.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border border-l-4 text-sm ${getLogBgColor(log.level)}`}
                style={{
                  borderLeftColor: log.level === 'ERROR' ? '#ef4444' :
                                  log.level === 'WARNING' ? '#f59e0b' :
                                  log.level === 'SUCCESS' ? '#10b981' :
                                  '#60a5fa'
                }}
              >
                {/* Log Header: Icon + Level + Source */}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`flex-shrink-0 ${getLogColor(log.level)}`}>
                    {getLogIcon(log.level)}
                  </div>
                  <span className={`font-semibold text-xs uppercase tracking-wider ${getLogColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    [{log.source}]
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
                  </span>
                </div>

                {/* Log Message */}
                <div className="text-xs leading-relaxed text-foreground font-mono">
                  {log.message}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
