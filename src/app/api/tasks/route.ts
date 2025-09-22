import { NextRequest, NextResponse } from 'next/server';
import { TaskRequest, TaskResponse, TaskListResponse } from '@/types';
import { getAgentService } from '@/services/agent-service';
import { getWebSocketManager } from '@/services/websocket-manager';

const websocketManager = getWebSocketManager();
const agentService = getAgentService(websocketManager);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TaskRequest;
    
    // Validate required fields
    if (!body.task_type || !body.configuration || !body.session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: task_type, configuration, session_id' },
        { status: 400 }
      );
    }

    // Create the task
    const task = await agentService.createTask(
      body.task_type,
      body.configuration,
      body.session_id,
      body.artifacts_url
    );

    // Start execution in background
    agentService.executeTask(task.id).catch(error => {
      console.error(`Background task execution failed for ${task.id}:`, error);
    });

    const response: TaskResponse = {
      id: task.id,
      task_type: task.task_type,
      status: task.status,
      current_phase: task.current_phase,
      current_activity: task.current_activity,
      configuration: task.configuration,
      session_path: task.session_path,
      session_id: task.session_id,
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed_at: task.completed_at,
      artifacts_url: task.artifacts_url,
      uploaded_artifacts: task.uploaded_artifacts,
      error: task.error
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: `Failed to create task: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const tasks = await agentService.getAllTasks();
    
    const response: TaskListResponse = {
      tasks,
      total_tasks: tasks.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing tasks:', error);
    return NextResponse.json(
      { error: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}