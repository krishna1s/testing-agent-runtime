import { NextRequest, NextResponse } from 'next/server';
import { TaskLogsResponse } from '@/types';
import { getAgentService } from '@/services/agent-service';
import { getWebSocketManager } from '@/services/websocket-manager';

const websocketManager = getWebSocketManager();
const agentService = getAgentService(websocketManager);

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    
    const task = await agentService.getTask(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    const response: TaskLogsResponse = {
      task_id: taskId,
      debug_logs: task.debug_logs,
      total_debug_entries: task.debug_logs.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting task logs:', error);
    return NextResponse.json(
      { error: `Failed to get task logs: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}