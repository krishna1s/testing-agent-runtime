import { WebSocket } from 'ws';
import { DebugMessage, StreamEvent } from '@/types';

export class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();

  addConnection(connectionId: string, ws: WebSocket): void {
    this.connections.set(connectionId, ws);
    
    ws.on('close', () => {
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.warn(`WebSocket error for connection ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });
  }

  removeConnection(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.close();
      this.connections.delete(connectionId);
    }
  }

  async sendDebugMessage(message: DebugMessage): Promise<void> {
    const event: StreamEvent = {
      event_type: 'debug',
      data: {
        timestamp: message.timestamp.toISOString(),
        level: message.level,
        message: message.message,
        task_id: message.task_id,
        agent: message.agent
      }
    };

    await this.broadcast(event);
  }

  async sendStatusUpdate(taskId: string, status: string, activity?: string): Promise<void> {
    const event: StreamEvent = {
      event_type: 'status',
      data: {
        task_id: taskId,
        status,
        activity,
        timestamp: new Date().toISOString()
      }
    };

    await this.broadcast(event);
  }

  async sendTaskComplete(taskId: string, success: boolean, error?: string): Promise<void> {
    const event: StreamEvent = {
      event_type: 'complete',
      data: {
        task_id: taskId,
        success,
        error,
        timestamp: new Date().toISOString()
      }
    };

    await this.broadcast(event);
  }

  async sendError(taskId: string, error: string): Promise<void> {
    const event: StreamEvent = {
      event_type: 'error',
      data: {
        task_id: taskId,
        error,
        timestamp: new Date().toISOString()
      }
    };

    await this.broadcast(event);
  }

  private async broadcast(event: StreamEvent): Promise<void> {
    const message = JSON.stringify(event);
    const deadConnections: string[] = [];

    const connections = Array.from(this.connections.entries());
    for (const [connectionId, ws] of connections) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          deadConnections.push(connectionId);
        }
      } catch (error) {
        console.warn(`Failed to send message to connection ${connectionId}:`, error);
        deadConnections.push(connectionId);
      }
    }

    // Clean up dead connections
    for (const connectionId of deadConnections) {
      this.connections.delete(connectionId);
    }
  }

  async closeAllConnections(): Promise<void> {
    const connections = Array.from(this.connections.entries());
    for (const [connectionId, ws] of connections) {
      try {
        ws.close();
      } catch (error) {
        console.warn(`Failed to close connection ${connectionId}:`, error);
      }
    }
    this.connections.clear();
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Global instance
let websocketManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!websocketManagerInstance) {
    websocketManagerInstance = new WebSocketManager();
  }
  return websocketManagerInstance;
}