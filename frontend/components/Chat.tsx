'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { sendMessage } from '@/lib/api';
import { Message } from '@/lib/api';
import MessageItem from './MessageItem';
import styles from './Chat.module.css';
import { Send, Loader2, Menu, Plus, MessageSquare, Settings } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <button
            className={styles.newChatButton}
            title="Start a new chat"
          >
            <Plus size={20} />
            <span>New chat</span>
          </button>
        </div>

        <div className={styles.sidebarContent}>
          <h3 className={styles.sidebarSection}>Chat History</h3>
          {/* Placeholder for chat history */}
          <p className={styles.emptyHistory}>No chat history yet</p>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.sidebarButton} title="Settings">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className={styles.chatContainer}>
        <div className={styles.chatMain}>
          {/* Top Bar with Menu */}
          <div className={styles.topBar}>
            <button
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className={styles.modelSelector}>ds-chat</h1>
            <div className={styles.topBarRight}></div>
          </div>

          {/* Messages Area */}
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
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

                {executionLogs.length > 0 && (
                  <div className={styles.logsSection}>
                    <div className={styles.logsTitle}>Execution Logs</div>
                    {executionLogs.map((log, idx) => (
                      <div key={idx} className={styles.logItem}>
                        <div className={styles.logLevel}>[{log.level}]</div>
                        <div className={styles.logSource}>{log.source}</div>
                        <div className={styles.logMessage}>{log.message}</div>
                      </div>
                    ))}
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
          </div>
        </div>
      </div>
    </div>
  );
}
