'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { sendMessage } from '@/lib/api';
import { Message } from '@/lib/api';
import MessageItem from './MessageItem';
import ExecutionLog from './ExecutionLog';
import { Send, Loader2, LogSquare } from 'lucide-react';

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
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const examplePrompts = [
    'What are the top site issues today?',
    'Show me issues for provider QL2',
    'What issues have increased this month?',
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-semibold">Analytics Chat</h1>
          <p className="text-xs text-muted-foreground">Query your data with natural language</p>
        </div>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            showLogs
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
          title="Toggle execution logs"
        >
          <LogSquare size={16} />
          {showLogs ? 'Hide' : 'Show'} Logs
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
                <div className="mb-6">
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-2xl font-semibold mb-2">Start Exploring Your Data</h2>
                  <p className="text-muted-foreground">Ask questions about your analytics in natural language</p>
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                  {examplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(prompt)}
                      className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-secondary transition-all text-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto w-full space-y-4">
                {messages.map((msg, idx) => (
                  <MessageItem key={idx} message={msg} />
                ))}

                {isLoading && (
                  <div className="flex gap-3 p-4 bg-secondary rounded-lg">
                    <Loader2 size={20} className="animate-spin text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Processing your request...</p>
                      <p className="text-xs text-muted-foreground">This may take 10-30 seconds</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                )}

                {lastMetrics && !isLoading && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-secondary rounded-lg text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tools Used</p>
                      <p className="font-mono text-sm">{Object.entries(lastMetrics.tools).map(([k, v]) => `${k}(${v})`).join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                      <p className="font-mono text-sm">{lastMetrics.tokens.total_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Time</p>
                      <p className="font-mono text-sm">{(lastMetrics.time_ms / 1000).toFixed(2)}s</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-background">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your data..."
                  disabled={isLoading || !sessionId}
                  className="w-full bg-secondary border border-border rounded-full py-3 px-4 pr-12 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !sessionId}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by FastAPI + OpenAI Agents + MCP
              </p>
            </div>
          </div>
        </div>

        {/* Logs Panel */}
        {showLogs && <ExecutionLog logs={executionLogs} />}
      </div>
    </div>
  );
}
