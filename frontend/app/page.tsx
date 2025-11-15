'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { createSession, healthCheck } from '@/lib/api';
import Chat from '@/components/Chat';
import styles from './page.module.css';

export default function Home() {
  const { sessionId, isInitialized, setSessionId, setInitialized, setError } = useChatStore();

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Check backend health
        const isHealthy = await healthCheck();
        if (!isHealthy) {
          setError('Backend is not available. Make sure the FastAPI server is running on http://localhost:8000');
          return;
        }

        // Create session
        const newSessionId = await createSession();
        setSessionId(newSessionId);
        setInitialized(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize chat';
        setError(`Initialization error: ${errorMsg}`);
      }
    };

    if (!isInitialized) {
      initializeChat();
    }
  }, [isInitialized, setSessionId, setInitialized, setError]);

  if (!isInitialized || !sessionId) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <h1>Analytics Chat</h1>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  return <Chat />;
}
