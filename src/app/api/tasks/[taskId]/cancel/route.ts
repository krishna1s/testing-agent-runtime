import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/services/agent-service';
import { getWebSocketManager } from '@/services/websocket-manager';

const websocketManager = getWebSocketManager();
const agentService = getAgentService(websocketManager);

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    
    const success = await agentService.cancelTask(taskId);
    
    if (!success) {
      return NextResponse.json(
        { error: `Task not found or cannot be cancelled: ${taskId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: `Task ${taskId} cancelled successfully`,
      cancelled: true 
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    return NextResponse.json(
      { error: `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}