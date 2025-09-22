import type { NextApiRequest, NextApiResponse } from 'next';
import { opencodeAgentService } from '../../../lib/opencode-agent-service';
import { opencodeServerManager } from '../../../lib/opencode-server';

// Server-Sent Events for real-time progress updates
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    sessionId,
    timestamp: new Date().toISOString(),
    server_connected: opencodeAgentService.isConnected(),
    server_url: opencodeAgentService.getServerUrl()
  })}\n\n`);

  let isActive = true;
  let pollInterval: NodeJS.Timeout;

  // Function to send progress updates
  const sendUpdate = async () => {
    if (!isActive) return;

    try {
      // Get current messages
      const messages = await opencodeAgentService.getMessages(sessionId);
      
      // Get task status if exists
      const task = await opencodeAgentService.getTask(sessionId);

      const update = {
        type: 'progress_update',
        sessionId,
        timestamp: new Date().toISOString(),
        messages,
        task: task ? {
          id: task.id,
          status: task.status,
          taskType: task.taskType,
          updatedAt: task.updatedAt
        } : null,
        server_connected: opencodeAgentService.isConnected()
      };

      res.write(`data: ${JSON.stringify(update)}\n\n`);
    } catch (error) {
      console.error('Error in progress update:', error);
      
      const errorUpdate = {
        type: 'error',
        sessionId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };

      res.write(`data: ${JSON.stringify(errorUpdate)}\n\n`);
    }
  };

  // Send updates every 2 seconds
  pollInterval = setInterval(sendUpdate, 2000);

  // Send immediate first update
  await sendUpdate();

  // Clean up when client disconnects
  req.on('close', () => {
    console.log(`SSE connection closed for session: ${sessionId}`);
    isActive = false;
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  req.on('end', () => {
    console.log(`SSE connection ended for session: ${sessionId}`);
    isActive = false;
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    if (!isActive) {
      clearInterval(heartbeat);
      return;
    }
    res.write(`data: ${JSON.stringify({ 
      type: 'heartbeat', 
      timestamp: new Date().toISOString() 
    })}\n\n`);
  }, 30000); // Every 30 seconds

  // Clean up heartbeat on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
}