# OpenCode SDK Integration Documentation

## Overview

The Agent Runtime API has been successfully upgraded to use the OpenCode SDK (`@opencode-ai/sdk`) for direct integration with OpenCode agents, replacing the previous subprocess-based approach.

## API Endpoints

### Task Management

#### Create Task
**POST** `/api/tasks`

Creates a new testing task with OpenCode session integration.

```bash
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "plan",
    "configuration": {
      "app_url": "https://example.com",
      "instructions": "Focus on user authentication and checkout flows"
    },
    "session_id": "my-session-123"
  }'
```

**Response:**
```json
{
  "id": "opencode-session-uuid",
  "task_id": "task-1758521004055",
  "task_type": "plan",
  "status": "running",
  "phase": "planning",
  "configuration": {
    "app_url": "https://example.com",
    "instructions": "Focus on user authentication and checkout flows"
  },
  "session_id": "opencode-session-uuid",
  "created_at": "2025-09-22T06:03:24.055Z",
  "updated_at": "2025-09-22T06:03:24.055Z",
  "messages_count": 1,
  "sdk_used": true
}
```

#### List Tasks
**GET** `/api/tasks`

Returns all active tasks.

#### Get Task Details
**GET** `/api/tasks/{taskId}`

Returns detailed information about a specific task.

### Interactive Conversation

#### Send Message to Agent
**POST** `/api/tasks/{taskId}/messages`

Send a message to the OpenCode agent and get a response.

```bash
curl -X POST http://localhost:5001/api/tasks/{taskId}/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Can you also test the checkout process?"}'
```

**Response:**
```json
{
  "id": "message-uuid",
  "type": "assistant",
  "content": "I'll analyze the checkout process and add those test cases to our plan...",
  "timestamp": "2025-09-22T06:05:30.123Z",
  "task_id": "task-id"
}
```

#### Get Conversation History
**GET** `/api/tasks/{taskId}/messages`

Retrieve all messages in the conversation thread.

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "type": "user",
      "content": "Create a test plan for https://example.com",
      "timestamp": "2025-09-22T06:03:24.055Z",
      "task_id": "task-id"
    },
    {
      "id": "msg-2", 
      "type": "assistant",
      "content": "I'll create a comprehensive test plan...",
      "timestamp": "2025-09-22T06:04:15.123Z",
      "task_id": "task-id"
    }
  ],
  "total_messages": 2,
  "task_id": "task-id",
  "sdk_used": true
}
```

### Task Control

#### Cancel Task
**POST** `/api/tasks/{taskId}/cancel`

Abort a running task and terminate the OpenCode session.

#### Get Task Status
**GET** `/api/tasks/{taskId}/status`

Get real-time status updates and latest message preview.

## Task Types

### Supported Task Types

1. **`complete`** - Full end-to-end testing workflow
   - Analyzes the application
   - Creates comprehensive test plan
   - Generates test scripts
   - Executes and reports results

2. **`plan`** - Analysis and test planning only
   - Explores application structure
   - Identifies critical user journeys
   - Creates detailed test strategy

3. **`generate`** - Test script generation
   - Creates automated test scripts
   - Covers main user flows
   - Includes assertions and validations

4. **`fix`** - Debug and repair existing tests
   - Analyzes test failures
   - Fixes broken test cases
   - Improves test reliability

5. **`run`** - Execute existing tests
   - Runs test suite
   - Reports results and failures
   - Provides recommendations

6. **`custom`** - User-defined instructions
   - Executes custom testing tasks
   - Uses provided instructions

## OpenCode SDK Methods Used

### Session Management
- `session.create()` - Creates new OpenCode sessions for tasks
- `session.get()` - Retrieves session information
- `session.abort()` - Cancels running sessions
- `session.delete()` - Removes sessions

### Communication
- `session.prompt()` - Sends messages to agents
- `session.messages()` - Retrieves conversation history

### Example SDK Usage

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk'

const client = createOpencodeClient()

// Create a session
const session = await client.session.create({
  body: { title: "Test Planning Session" }
})

// Send a prompt
const response = await client.session.prompt({
  path: { id: session.data.id },
  body: { 
    parts: [{ type: 'text', text: 'Create tests for the login flow' }]
  }
})

// Get conversation history
const messages = await client.session.messages({
  path: { id: session.data.id }
})
```

## Benefits Over Subprocess Approach

1. **Direct API Integration** - No process spawning overhead
2. **Type Safety** - Full TypeScript support with OpenCode types
3. **Better Error Handling** - Native exception handling
4. **Real-time Communication** - Direct message exchange
5. **Session Persistence** - Proper state management
6. **Scalability** - No process limitations

## Error Handling

The API includes comprehensive error handling with graceful fallbacks:

- SDK connection issues fall back to mock responses
- Session not found errors return appropriate HTTP status codes
- All responses include `sdk_used` boolean to indicate actual SDK usage
- Detailed error messages for debugging

## Authentication

The OpenCode SDK will use the local OpenCode authentication configuration. Ensure OpenCode is properly configured with:

```bash
opencode auth login
```

## Testing the Integration

```bash
# Test SDK availability
curl http://localhost:5001/api/opencode-test

# Create a task
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task_type": "plan", "configuration": {"app_url": "https://example.com"}, "session_id": "test"}'

# Send a follow-up message
curl -X POST http://localhost:5001/api/tasks/{taskId}/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Add accessibility tests too"}'

# Get conversation
curl http://localhost:5001/api/tasks/{taskId}/messages

# Cancel if needed
curl -X POST http://localhost:5001/api/tasks/{taskId}/cancel
```

This implementation provides a modern, type-safe, and scalable foundation for interacting with OpenCode agents through a comprehensive REST API.