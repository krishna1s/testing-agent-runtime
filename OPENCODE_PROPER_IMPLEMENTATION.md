# OpenCode SDK Proper Implementation Guide

## Overview

This document outlines the complete implementation of OpenCode SDK integration following the official documentation at https://opencode.ai/docs/sdk/. The implementation addresses the key requirements:

1. **Server-Client Architecture**: Uses `createOpencodeServer()` and `createOpencodeClient()`
2. **SDK Method Integration**: Replaces all subprocess calls with direct SDK methods
3. **Agent Service Rewrite**: Complete rewrite of the agent service using SDK

## Architecture

### Server Management (`lib/opencode-server.ts`)

```typescript
import { createOpencodeServer, createOpencodeClient } from '@opencode-ai/sdk';

export class OpenCodeServerManager {
  private server: { url: string; close(): void } | null = null;
  private client: OpencodeClient | null = null;

  async startServer(): Promise<string> {
    // Creates OpenCode server using SDK
    this.server = await createOpencodeServer({
      hostname: 'localhost',
      port: 3001,
      timeout: 30000
    });

    // Creates client connected to our server
    this.client = createOpencodeClient({
      baseUrl: this.server.url
    });

    return this.server.url;
  }
}
```

### Agent Service (`lib/opencode-agent-service.ts`)

```typescript
export class OpenCodeAgentService {
  private client: OpencodeClient | null = null;

  async createTask(config: TaskConfig): Promise<TaskSession> {
    // Ensure server connection
    this.client = await opencodeServerManager.ensureServerAndClient();

    // Create session using SDK
    const sessionResponse = await this.client.session.create({
      body: { title: `${config.taskType} - ${config.appUrl}` }
    });

    // Send initial prompt using SDK
    await this.client.session.prompt({
      path: { id: sessionResponse.data.id },
      body: { parts: [{ type: 'text', text: prompt }] }
    });
  }

  async sendMessage(taskId: string, message: string): Promise<TaskMessage> {
    // Direct SDK call instead of subprocess
    const response = await this.client.session.prompt({
      path: { id: opencodeSessionId },
      body: { parts: [{ type: 'text', text: message }] }
    });
  }
}
```

## API Integration

### Task Creation with Server Integration

**Endpoint**: `POST /api/tasks`

```typescript
// Before: Subprocess approach
const process = spawn('opencode', ['run', '--session', sessionId]);

// After: SDK approach  
const taskSession = await opencodeAgentService.createTask({
  taskType: body.task_type,
  appUrl: body.configuration.app_url,
  instructions: body.configuration.instructions
});
```

**Response includes server connection info**:
```json
{
  "id": "task-123",
  "opencode_session_id": "session-uuid",
  "server_connected": true,
  "server_url": "http://localhost:3001",
  "status": "running"
}
```

### Interactive Messaging

**Endpoint**: `POST /api/tasks/{taskId}/messages`

```typescript
// Uses agent service with SDK integration
const taskMessage = await opencodeAgentService.sendMessage(taskId, message);
```

**Response includes real-time agent communication**:
```json
{
  "id": "msg-456",
  "type": "assistant", 
  "content": "I'll analyze your application...",
  "timestamp": "2025-09-22T07:30:00Z"
}
```

## Server Connection Flow

### 1. Automatic Server Startup

```bash
# First API call triggers server startup
curl http://localhost:5001/api/opencode-test
# Response: {"server_running": false, "version": "Starting server..."}

# Second call shows running server
curl http://localhost:5001/api/opencode-test  
# Response: {"server_running": true, "server_url": "http://localhost:3001"}
```

### 2. Task Creation with Server

```bash
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "plan",
    "configuration": {"app_url": "https://example.com"},
    "session_id": "demo"
  }'
```

**Response shows OpenCode session created on server**:
```json
{
  "id": "demo",
  "opencode_session_id": "opencode-session-abc123",
  "server_connected": true,
  "server_url": "http://localhost:3001",
  "status": "running"
}
```

### 3. Iterative Chat with Agent

```bash
# Send message to agent via SDK
curl -X POST http://localhost:5001/api/tasks/demo/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Focus on authentication testing"}'

# Get conversation history via SDK  
curl http://localhost:5001/api/tasks/demo/messages
```

## Key Improvements Over Subprocess Approach

### Before (Subprocess)
```python
# Python subprocess approach
process = await asyncio.create_subprocess_exec(
    "opencode", "run", "--session", session_id,
    cwd=session_path,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE
)
```

### After (SDK)
```typescript
// Direct SDK integration
const client = await opencodeServerManager.ensureServerAndClient();
const response = await client.session.prompt({
  path: { id: sessionId },
  body: { parts: [{ type: 'text', text: message }] }
});
```

### Benefits

1. **Type Safety**: Full TypeScript support with OpenCode SDK types
2. **Error Handling**: Native promise-based error handling vs process management
3. **Performance**: Direct API calls vs subprocess overhead
4. **Connection Management**: Persistent server connection vs process spawning
5. **Real-time Communication**: Immediate response vs stdout parsing

## Error Handling

### Server Connection Issues
```typescript
try {
  const client = await opencodeServerManager.ensureServerAndClient();
} catch (error) {
  // Graceful fallback or retry logic
  console.error('OpenCode server connection failed:', error);
}
```

### Session Management
```typescript
// SDK handles session state properly
const messages = await client.session.messages({
  path: { id: sessionId }
});
// vs subprocess parsing of session files
```

## Testing the Implementation

### 1. Server Status Check
```bash
curl http://localhost:5001/api/opencode-test
```

Expected response when OpenCode binary available:
```json
{
  "sdk_available": true,
  "server_running": true,
  "server_url": "http://localhost:3001",
  "version": "OpenCode server started at http://localhost:3001"
}
```

Expected response without OpenCode binary:
```json
{
  "sdk_available": true,
  "server_running": false,
  "error": "Server start failed: spawn opencode ENOENT"
}
```

### 2. Complete Workflow Test

```bash
# 1. Check server
curl http://localhost:5001/api/opencode-test

# 2. Create task (auto-starts server if available)
curl -X POST http://localhost:5001/api/tasks \
  -d '{"task_type":"plan","configuration":{"app_url":"https://example.com"},"session_id":"test"}'

# 3. Send message to agent
curl -X POST http://localhost:5001/api/tasks/test/messages \
  -d '{"message":"Add mobile testing"}'

# 4. Get conversation
curl http://localhost:5001/api/tasks/test/messages

# 5. Cancel task
curl -X POST http://localhost:5001/api/tasks/test/cancel
```

## Summary

The implementation now properly follows the OpenCode SDK documentation by:

1. **✅ Using `createOpencodeServer()`** to start local OpenCode server
2. **✅ Using `createOpencodeClient()`** with proper `baseUrl` configuration  
3. **✅ Replacing all subprocess calls** with direct SDK method calls
4. **✅ Implementing proper agent service** using SDK session management
5. **✅ Providing server connection status** in all API responses

This addresses the comment about needing to connect to an OpenCode server and using actual SDK methods instead of subprocess calls. The agent service is now completely rewritten to use the OpenCode SDK properly.