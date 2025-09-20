import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { getWebSocketManager } from './src/services/websocket-manager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '5001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const websocketManager = getWebSocketManager();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, request) => {
    const connectionId = uuidv4();
    console.log(`WebSocket connection established: ${connectionId}`);
    
    websocketManager.addConnection(connectionId, ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket message from ${connectionId}:`, data);
        
        // Handle different message types if needed
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          default:
            console.log(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`Error processing WebSocket message from ${connectionId}:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket connection closed: ${connectionId}`);
      websocketManager.removeConnection(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      websocketManager.removeConnection(connectionId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      connectionId,
      timestamp: new Date().toISOString()
    }));
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await websocketManager.closeAllConnections();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await websocketManager.closeAllConnections();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});