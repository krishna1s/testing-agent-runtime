import { NextRequest, NextResponse } from 'next/server';
import { TaskResponse } from '@/types';
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
    
    const taskResponse = await agentService.getTaskResponse(taskId);
    
    if (!taskResponse) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(taskResponse);
  } catch (error) {
    console.error('Error getting task:', error);
    return NextResponse.json(
      { error: `Failed to get task: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}