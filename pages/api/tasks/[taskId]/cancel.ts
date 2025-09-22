import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeAgentService } from '../../../../lib/opencode-agent-service'

interface CancelResponse {
  message: string
  cancelled: boolean
  task_id: string
  server_connected: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CancelResponse | { error: string }>
) {
  const { taskId } = req.query

  if (typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'POST') {
    try {
      const success = await opencodeAgentService.cancelTask(taskId)
      
      if (!success) {
        return res.status(404).json({ error: `Task not found or cannot be cancelled: ${taskId}` })
      }

      const response: CancelResponse = {
        message: `Task ${taskId} cancelled successfully`,
        cancelled: true,
        task_id: taskId,
        server_connected: opencodeAgentService.isConnected()
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error cancelling task:', error)
      res.status(500).json({
        error: `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}