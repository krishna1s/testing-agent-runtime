# OpenCode Testing Agent - React Frontend

This is the React Vite frontend for the OpenCode Testing Agent runtime, providing a chat interface for interactive testing with AI agents.

## Features

- **Interactive Chat Interface**: Real-time conversation with OpenCode AI agents
- **Session Management**: Create multiple chat sessions and switch between them
- **Task Type Management**: First message creates a "complete" task, follow-ups use "custom" type
- **Real-time Progress Updates**: Server-Sent Events for live agent progress tracking
- **Application URL Configuration**: Set target app URL for testing
- **Task Status Monitoring**: Visual indicators for task status and progress

## Architecture

The frontend connects to the TypeScript Next.js backend which uses the OpenCode SDK:

1. **Chat Sessions**: Each chat creates a unique session ID
2. **Task Creation**: First message creates an OpenCode session with "complete" task type
3. **Follow-up Messages**: Subsequent messages in the same session use "custom" task type
4. **Real-time Updates**: Server-Sent Events stream progress from OpenCode agent
5. **Status Tracking**: Live updates of task status and conversation history

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173` and proxy API calls to the backend on `http://localhost:5001`.

## Usage

1. **Start New Chat**: Click "New Chat" to create a session
2. **Configure App URL**: Set the target application URL in the sidebar
3. **Send First Message**: Describe what you want to test (creates "complete" task)
4. **Continue Conversation**: Send follow-up messages to the same agent session
5. **Monitor Progress**: Watch real-time updates as the agent works
6. **Switch Sessions**: Click on session names to switch between different conversations

## API Integration

The frontend communicates with these backend endpoints:

- `POST /api/tasks` - Create new tasks with OpenCode session
- `POST /api/tasks/{id}/messages` - Send messages to existing sessions
- `GET /api/events/{sessionId}` - Server-Sent Events for real-time updates
- `POST /api/tasks/{id}/cancel` - Cancel running tasks

## Real-time Progress

Progress tracking is implemented using OpenCode's event streaming pattern:

- **Server-Sent Events**: Continuous connection for real-time updates
- **Message Polling**: Backend polls OpenCode session for new messages
- **Status Updates**: Task status changes are pushed to the frontend
- **Error Handling**: Connection drops and errors are handled gracefully

This provides a similar experience to OpenCode TUI but in a web interface.