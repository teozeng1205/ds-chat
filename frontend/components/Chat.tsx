'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { sendMessage } from '@/lib/api';
import { Message } from '@/lib/api';
import MessageItem from './MessageItem';
import ExecutionLog from './ExecutionLog';
import styles from './Chat.module.css';
import { Send, Loader2 } from 'lucide-react';

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
    <div className={styles.chatContainer}>
      <div className={styles.chatMain}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Analytics Chat</h1>
            <p>Query your database with natural language</p>
          </div>
          <button
            className={`${styles.logsButton} ${showLogs ? styles.active : ''}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle execution logs"
          >
            {showLogs ? '✓ Logs' : 'Logs'}
          </button>
        </div>

        {/* Messages Area */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <h2>Start Exploring Your Data</h2>
              <p>Ask questions about your analytics in natural language</p>
              <div className={styles.examples}>
                <button
                  onClick={() => setInput('What are the top site issues today?')}
                  className={styles.exampleButton}
                >
                  What are the top site issues today?
                </button>
                <button
                  onClick={() => setInput('Show me issues for provider QL2')}
                  className={styles.exampleButton}
                >
                  Show me issues for provider QL2
                </button>
                <button
                  onClick={() => setInput('What issues have increased this month?')}
                  className={styles.exampleButton}
                >
                  What issues have increased this month?
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.messages}>
              {messages.map((msg, idx) => (
                <MessageItem key={idx} message={msg} />
              ))}

              {isLoading && (
                <div className={styles.loadingMessage}>
                  <div className={styles.loadingContent}>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Processing your request...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.errorMessage}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {lastMetrics && !isLoading && (
                <div className={styles.metricsBar}>
                  <div className={styles.metric}>
                    <span className={styles.label}>Tools:</span>
                    <span className={styles.value}>
                      {Object.entries(lastMetrics.tools)
                        .map(([k, v]) => `${k}(${v})`)
                        .join(', ')}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.label}>Tokens:</span>
                    <span className={styles.value}>
                      {lastMetrics.tokens.total_tokens.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.label}>Time:</span>
                    <span className={styles.value}>{lastMetrics.time_ms.toFixed(1)}ms</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={styles.inputContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data..."
              disabled={isLoading || !sessionId}
              className={styles.input}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !sessionId}
              className={styles.submitButton}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
          <p className={styles.footer}>
            Powered by FastAPI + OpenAI Agents + MCP
          </p>
        </div>
      </div>

      {/* Execution Logs Panel */}
      {showLogs && <ExecutionLog logs={executionLogs} />}
    </div>
  );
}
