import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Square, Plus, MessageCircle } from 'lucide-react';
import './App.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sessionId: string;
}

interface TaskSession {
  id: string;
  taskId: string;
  taskType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  opencodeSessionId?: string;
  messages: Message[];
}

interface ProgressUpdate {
  type: string;
  sessionId: string;
  timestamp: string;
  messages?: Message[];
  task?: {
    id: string;
    status: string;
    taskType: string;
    updatedAt: string;
  };
  server_connected?: boolean;
}

function App() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskSession | null>(null);
  const [appUrl, setAppUrl] = useState('https://example.com');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up Server-Sent Events for active session
  useEffect(() => {
    if (!activeSession) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Connect to SSE endpoint for this session
    const eventSource = new EventSource(`/api/events/${activeSession}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connected for session:', activeSession);
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressUpdate = JSON.parse(event.data);
        console.log('SSE message:', data);

        switch (data.type) {
          case 'connected':
            setConnected(true);
            break;
          case 'progress_update':
            if (data.messages) {
              setMessages(data.messages);
            }
            if (data.task) {
              setCurrentTask(prev => prev ? { ...prev, ...data.task } : null);
              if (data.task.status === 'completed' || data.task.status === 'failed') {
                setIsLoading(false);
              }
            }
            break;
          case 'error':
            console.error('SSE error:', data);
            setIsLoading(false);
            break;
          case 'heartbeat':
            // Keep connection alive
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [activeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Create new session
  const createNewSession = () => {
    const sessionId = `session-${Date.now()}`;
    setSessions(prev => [...prev, sessionId]);
    setActiveSession(sessionId);
    setMessages([]);
    setCurrentTask(null);
    setInputMessage('');
  };

  // Switch to a session
  const switchToSession = (sessionId: string) => {
    setActiveSession(sessionId);
    setMessages([]);
    setCurrentTask(null);
  };

  // Send message via API
  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeSession) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      sessionId: activeSession
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Determine if this is the first message (create task) or follow-up (send message)
      if (!currentTask) {
        // First message - create task with 'complete' type
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_type: 'complete',
            configuration: {
              app_url: appUrl,
              instructions: inputMessage
            },
            session_id: activeSession
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const task = await response.json();
        setCurrentTask(task);
      } else {
        // Follow-up message - send to existing session
        const response = await fetch(`/api/tasks/${activeSession}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: inputMessage })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const message = await response.json();
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    setInputMessage('');
  };

  // Cancel current task
  const cancelTask = async () => {
    if (!activeSession) return;
    
    try {
      const response = await fetch(`/api/tasks/${activeSession}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>OpenCode Chat</h2>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        <button onClick={createNewSession} className="new-session-btn">
          <Plus size={16} />
          New Chat
        </button>

        <div className="sessions-list">
          {sessions.map(sessionId => (
            <div
              key={sessionId}
              className={`session-item ${activeSession === sessionId ? 'active' : ''}`}
              onClick={() => switchToSession(sessionId)}
            >
              <MessageCircle size={16} />
              <span>{sessionId}</span>
            </div>
          ))}
        </div>

        <div className="app-url-config">
          <label>App URL:</label>
          <input
            type="url"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="main-chat">
        {!activeSession ? (
          <div className="welcome-screen">
            <h1>Welcome to OpenCode Testing Agent</h1>
            <p>Create a new chat to start testing your application with AI agents.</p>
            <button onClick={createNewSession} className="welcome-btn">
              <Plus size={20} />
              Start New Chat
            </button>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <h3>Session: {activeSession}</h3>
              {currentTask && (
                <div className="task-info">
                  <span className={`task-status ${currentTask.status}`}>
                    {currentTask.status.toUpperCase()}
                  </span>
                  <span className="task-type">{currentTask.taskType}</span>
                </div>
              )}
            </div>

            <div className="messages-container">
              {messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-icon">
                    {message.type === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-icon">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      <Loader2 size={16} className="spinner" />
                      Agent is working...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    !currentTask 
                      ? "Describe what you want to test (e.g., 'Test the login flow and user authentication')"
                      : "Continue the conversation with the agent..."
                  }
                  disabled={isLoading}
                  rows={2}
                />
                <div className="input-actions">
                  {isLoading && (
                    <button onClick={cancelTask} className="cancel-btn">
                      <Square size={16} />
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                    className="send-btn"
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
