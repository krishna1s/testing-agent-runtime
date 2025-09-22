import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeService, type TaskSession } from '../../../lib/opencode-service'

interface TaskDetailResponse {
  id: string
  task_id: string
  task_type: string
  status: string
  phase: string
  configuration: {
    app_url: string
    instructions?: string
  }
  session_id: string
  created_at: string
  updated_at: string
  messages_count: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TaskDetailResponse | { error: string }>
) {
  const { taskId } = req.query

  if (typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'GET') {
    try {
      const session = await opencodeService.getSession(taskId)
      
      if (!session) {
        return res.status(404).json({ error: `Task not found: ${taskId}` })
      }

      const response: TaskDetailResponse = {
        id: session.id,
        task_id: session.taskId,
        task_type: session.taskType,
        status: session.status,
        phase: session.phase,
        configuration: {
          app_url: session.appUrl
        },
        session_id: session.id,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        messages_count: session.messages.length
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error getting task:', error)
      res.status(500).json({
        error: `Failed to get task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}