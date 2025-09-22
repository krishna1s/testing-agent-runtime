# Agent Runtime API - TypeScript Edition

**TypeScript Agent Runtime API with Next.js and OpenCode SDK integration** - Modern, strongly-typed AI agent orchestration for automated test generation.

## Features

- 🚀 **Next.js + TypeScript** - Modern, fast, and type-safe web framework
- 🔌 **OpenCode SDK Integration** - Direct SDK calls instead of subprocess management
- 🤖 **AI Agent Orchestration** - Coordinates multiple specialized testing agents
- 🐳 **Docker Ready** - Complete containerization with docker-compose
- 📊 **Comprehensive Testing** - Built-in API testing and monitoring tools
- 🏥 **Health Monitoring** - Built-in health checks and status endpoints
- ⚡ **Type Safety** - Full TypeScript type definitions and compile-time checking

## Recent Changes: Python to TypeScript Conversion ✅

This repository has been successfully converted from Python FastAPI to TypeScript with Next.js. See [CONVERSION_SUMMARY.md](CONVERSION_SUMMARY.md) for detailed migration information.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenCode CLI installed
- TypeScript knowledge

### Installation and Setup

```bash
# Install dependencies
npm install

# Setup OpenCode and browsers
npm run setup

# Verify OpenCode installation
npm run verify

# Start development server
npm run dev
```

### API Testing

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test OpenCode SDK availability
curl http://localhost:5001/api/opencode-test

# Create a task
curl -X POST http://localhost:5001/api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_type": "complete",
    "configuration": {
      "app_url": "https://example.com",
      "instructions": "Test the login and checkout flows"
    },
    "session_id": "session-123"
  }'
```

## Project Structure

```
├── pages/api/                  # Next.js API routes
│   ├── index.ts                    # Root API endpoint
│   ├── health.ts                   # Health check endpoint
│   ├── opencode-test.ts            # OpenCode SDK test
│   └── tasks/                      # Task management endpoints
├── src/
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts                # Task, Configuration, Response types
│   ├── services/               # Business logic layer
│   │   ├── agent-service.ts        # Agent orchestration with SDK
│   │   └── websocket-manager.ts    # WebSocket connection management
│   └── utils/                  # Utility functions
├── lib/
│   └── config.ts              # Configuration management
├── .opencode/                 # OpenCode configuration and prompts
├── sessions/                  # Task workspace directories (runtime)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── next.config.js            # Next.js configuration
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
```

## API Endpoints

### System
- `GET /api` - API information
- `GET /api/health` - Health check with OpenCode availability
- `GET /api/opencode-test` - Test OpenCode SDK integration

### Tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/{task_id}` - Get task status
- `POST /api/tasks/{task_id}/cancel` - Cancel task
- `GET /api/tasks/{task_id}/logs` - Get task logs

## Task Types

- **complete**: Full pipeline (plan → generate → fix → run)
- **plan**: Analysis and test planning only
- **generate**: Generate tests from existing plan
- **fix**: Debug and repair failing tests
- **run**: Execute existing tests
- **custom**: Execute direct user instructions

## Configuration

Configure via environment variables:

- `SESSION_ROOT`: Directory for task workspaces (default: "./sessions")
- `OPENCODE_COMMAND`: OpenCode command (default: "opencode")
- `OPENCODE_CONFIG_PATH`: Path to OpenCode configuration (default: "./opencode.json")
- `OPENCODE_DIR`: Path to .opencode directory (default: "./.opencode")
- `HOST`: Server host (default: "0.0.0.0")
- `PORT`: Server port (default: "5001")
- `CORS_ORIGINS`: Allowed CORS origins (default: "*")

## Example Usage

```typescript
// TypeScript example
const response = await fetch('http://localhost:5001/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_type: 'complete',
    configuration: {
      app_url: 'https://example.com',
      instructions: 'Focus on user authentication flows'
    },
    session_id: 'session-' + Date.now()
  })
});

const task = await response.json();
console.log('Task created:', task.id);
```

## Development

The application uses modern TypeScript patterns:

- **Next.js**: Modern, fast web framework with API routes
- **TypeScript**: Full type safety with interfaces and enums
- **OpenCode SDK**: Direct SDK integration instead of subprocess calls
- **Async/Await**: Asynchronous request handling
- **Type Definitions**: Complete type coverage for better development experience

## Workspace Structure

Each task creates an isolated workspace:

```
sessions/
└── {task_id}/
    ├── opencode.json       # Task configuration
    ├── .opencode/          # OpenCode agents and prompts
    ├── specs/              # Test plans (markdown)
    ├── tests/              # Generated test files
    └── artifacts/          # Videos, traces, screenshots
```

## Migration from Python

This project was successfully migrated from Python FastAPI to TypeScript Next.js. Key improvements:

- **Type Safety**: Compile-time type checking vs runtime validation
- **Modern Tooling**: Better development experience and debugging
- **SDK Integration**: Direct OpenCode SDK usage instead of subprocess calls
- **Unified Stack**: Single language for frontend and backend
- **Performance**: Better resource utilization and faster startup

For detailed migration information, see [CONVERSION_SUMMARY.md](CONVERSION_SUMMARY.md).

## OpenCode Integration

The application now uses the official OpenCode TypeScript SDK (`@opencode-ai/sdk`) for:

- Agent orchestration and management
- Session creation and handling
- Task execution and monitoring
- Real-time progress updates

This provides better type safety, error handling, and performance compared to the previous subprocess-based approach.