'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { sendMessage } from '@/lib/api';
import { Message } from '@/lib/api';
import MessageItem from './MessageItem';
import ExecutionLog from './ExecutionLog';
import { Send, Loader2, Menu, X } from 'lucide-react';

export default function Chat() {
  const {
    sessionId,
    messages,
    executionLogs,
    isLoading,
    error,
    lastMetrics,
    addMessage,
    addExecutionLog,
    setLoading,
    setError,
    setLastMetrics,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, executionLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage(sessionId, userMessage, (log) => {
        addExecutionLog(log);
      });

      addMessage({ role: 'assistant', content: response.response });
      setLastMetrics({
        tools: response.tools,
        tokens: response.tokens,
        time_ms: response.time_ms,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMsg);
      addMessage({
        role: 'assistant',
        content: `Error: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full bg-background text-foreground">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-border bg-background px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Analytics Chat</h1>
            <p className="text-sm text-muted-foreground">Query your database with natural language</p>
          </div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`rounded-full h-9 px-4 font-medium text-sm transition-colors ${
              showLogs
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title="Toggle execution logs"
          >
            {showLogs ? '✓ Logs' : 'Logs'}
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-xl font-semibold mb-2">Start Exploring Your Data</h2>
              <p className="text-muted-foreground mb-8 text-center">
                Ask questions about your analytics in natural language
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                <button
                  onClick={() => setInput('What are the top site issues today?')}
                  className="p-4 rounded-xl border border-border bg-card text-card-foreground hover:border-accent-foreground hover:bg-accent transition-colors text-sm text-left"
                >
                  What are the top site issues today?
                </button>
                <button
                  onClick={() => setInput('Show me issues for provider QL2')}
                  className="p-4 rounded-xl border border-border bg-card text-card-foreground hover:border-accent-foreground hover:bg-accent transition-colors text-sm text-left"
                >
                  Show me issues for provider QL2
                </button>
                <button
                  onClick={() => setInput('What issues have increased this month?')}
                  className="p-4 rounded-xl border border-border bg-card text-card-foreground hover:border-accent-foreground hover:bg-accent transition-colors text-sm text-left"
                >
                  What issues have increased this month?
                </button>
                <button
                  onClick={() => setInput('Compare issue trends over time')}
                  className="p-4 rounded-xl border border-border bg-card text-card-foreground hover:border-accent-foreground hover:bg-accent transition-colors text-sm text-left"
                >
                  Compare issue trends over time
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((msg, idx) => (
                <MessageItem key={idx} message={msg} />
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div className="flex gap-2 items-center text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing your request...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {lastMetrics && !isLoading && (
                <div className="p-3 rounded-lg bg-secondary text-secondary-foreground text-sm space-y-2 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tools:</span>
                    <span>
                      {Object.entries(lastMetrics.tools)
                        .map(([k, v]) => `${k}(${v})`)
                        .join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tokens:</span>
                    <span>{lastMetrics.tokens.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Time:</span>
                    <span>{lastMetrics.time_ms.toFixed(1)}ms</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background px-4 py-4 space-y-2">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data..."
              disabled={isLoading || !sessionId}
              className="flex-1 rounded-3xl px-4 py-2 bg-input text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !sessionId}
              className="rounded-full h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Powered by FastAPI + OpenAI Agents + MCP
          </p>
        </div>
      </div>

      {/* Execution Logs Panel */}
      {showLogs && <ExecutionLog logs={executionLogs} />}
    </div>
  );
}
