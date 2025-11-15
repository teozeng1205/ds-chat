'use client';

import React, { useEffect, useRef } from 'react';
import { ExecutionLog } from '@/lib/api';
import styles from './ExecutionLog.module.css';
import { X, AlertCircle, Info } from 'lucide-react';

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
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      case 'INFO':
        return '#60a5fa';
      default:
        return '#94a3b8';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle size={14} />;
      case 'INFO':
        return <Info size={14} />;
      default:
        return <span>•</span>;
    }
  };

  return (
    <div className={styles.logPanel}>
      <div className={styles.header}>
        <h2>Execution Log</h2>
        <p className={styles.subtitle}>Agent operations and system events</p>
      </div>

      <div className={styles.logsContainer}>
        {logs.length === 0 ? (
          <div className={styles.emptyLog}>
            <p>No logs yet. Send a message to see execution details.</p>
          </div>
        ) : (
          <div className={styles.logs}>
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={styles.logEntry}
                style={{ borderLeftColor: getLogColor(log.level) }}
              >
                <div className={styles.logHeader}>
                  <div
                    className={styles.logIcon}
                    style={{ color: getLogColor(log.level) }}
                  >
                    {getLogIcon(log.level)}
                  </div>
                  <span
                    className={styles.logLevel}
                    style={{ color: getLogColor(log.level) }}
                  >
                    {log.level}
                  </span>
                  <span className={styles.logSource}>[{log.source}]</span>
                  <span className={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={styles.logMessage}>{log.message}</div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
