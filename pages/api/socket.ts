import { Server } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { opencodeAgentService } from '../../lib/opencode-agent-service';
import { opencodeServerManager } from '../../lib/opencode-server';

// Create HTTP server for Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], // Vite dev server
    methods: ["GET", "POST"]
  }
});

// Store active sessions and their socket connections
const activeSessions = new Map<string, { sessionId: string, socketId: string, taskId?: string }>();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a session room for progress updates
  socket.on('join-session', (sessionId: string) => {
    socket.join(`session-${sessionId}`);
    activeSessions.set(socket.id, { sessionId, socketId: socket.id });
    console.log(`Client ${socket.id} joined session: ${sessionId}`);
  });

  // Handle task creation
  socket.on('create-task', async (data: {
    sessionId: string;
    taskType: 'complete' | 'custom';
    appUrl?: string;
    message: string;
  }) => {
    try {
      const session = activeSessions.get(socket.id);
      if (!session) {
        socket.emit('error', 'No session found');
        return;
      }

      // Check if this session already has a task (then use custom type)
      const existingTask = await opencodeAgentService.getTask(data.sessionId);
      const actualTaskType = existingTask ? 'custom' : (data.taskType || 'complete');

      // Create or continue task
      let taskSession;
      if (existingTask) {
        // Send message to existing task
        const message = await opencodeAgentService.sendMessage(data.sessionId, data.message);
        socket.emit('message-sent', message);
        
        // Get updated task
        taskSession = await opencodeAgentService.getTask(data.sessionId);
      } else {
        // Create new task
        taskSession = await opencodeAgentService.createTask({
          taskType: actualTaskType as any,
          appUrl: data.appUrl || 'https://example.com',
          instructions: data.message
        }, data.sessionId);
      }

      // Update session tracking
      activeSessions.set(socket.id, { 
        ...session, 
        taskId: taskSession?.id 
      });

      // Emit task created/updated
      socket.emit('task-created', taskSession);

      // Start progress monitoring
      startProgressMonitoring(socket, data.sessionId, taskSession?.id);

    } catch (error) {
      console.error('Error creating task:', error);
      socket.emit('error', `Failed to create task: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Handle sending messages to existing tasks
  socket.on('send-message', async (data: { sessionId: string, message: string }) => {
    try {
      const message = await opencodeAgentService.sendMessage(data.sessionId, data.message);
      socket.emit('message-sent', message);
      
      // Continue progress monitoring
      startProgressMonitoring(socket, data.sessionId);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', `Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Handle getting conversation history
  socket.on('get-messages', async (sessionId: string) => {
    try {
      const messages = await opencodeAgentService.getMessages(sessionId);
      socket.emit('messages-updated', messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      socket.emit('error', `Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Handle cancelling tasks
  socket.on('cancel-task', async (sessionId: string) => {
    try {
      const success = await opencodeAgentService.cancelTask(sessionId);
      socket.emit('task-cancelled', { sessionId, success });
    } catch (error) {
      console.error('Error cancelling task:', error);
      socket.emit('error', `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    activeSessions.delete(socket.id);
  });
});

// Progress monitoring function
async function startProgressMonitoring(socket: any, sessionId: string, taskId?: string) {
  // Poll for message updates every 2 seconds
  const interval = setInterval(async () => {
    try {
      const messages = await opencodeAgentService.getMessages(sessionId);
      socket.emit('messages-updated', messages);

      // Get task status
      if (taskId) {
        const task = await opencodeAgentService.getTask(taskId);
        socket.emit('task-status-updated', task);
        
        // Stop monitoring if task is completed or failed
        if (task && (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled')) {
          clearInterval(interval);
        }
      }
    } catch (error) {
      console.error('Error in progress monitoring:', error);
      clearInterval(interval);
    }
  }, 2000);

  // Clean up interval after 5 minutes
  setTimeout(() => {
    clearInterval(interval);
  }, 5 * 60 * 1000);
}

// Start Socket.IO server on port 3001
if (!httpServer.listening) {
  httpServer.listen(3001, () => {
    console.log('Socket.IO server running on port 3001');
  });
}

// Next.js API route handler (for HTTP requests)
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'WebSocket server is running',
      socket_url: 'ws://localhost:3001',
      server_connected: opencodeAgentService.isConnected(),
      server_url: opencodeAgentService.getServerUrl()
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export { io };