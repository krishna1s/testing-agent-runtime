import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeService } from '../../../../lib/opencode-service'

interface StatusResponse {
  task_id: string
  status: string
  phase: string
  updated_at: string
  messages_count: number
  latest_message?: {
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { error: string }>
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

      // Get the latest message if any
      const messages = await opencodeService.getSessionMessages(taskId)
      const latestMessage = messages.length > 0 ? messages[messages.length - 1] : undefined

      const response: StatusResponse = {
        task_id: taskId,
        status: session.status,
        phase: session.phase,
        updated_at: session.updatedAt.toISOString(),
        messages_count: messages.length,
        latest_message: latestMessage ? {
          id: latestMessage.id,
          type: latestMessage.type,
          content: latestMessage.content.substring(0, 200) + (latestMessage.content.length > 200 ? '...' : ''),
          timestamp: latestMessage.timestamp.toISOString()
        } : undefined
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error getting task status:', error)
      res.status(500).json({
        error: `Failed to get task status: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}