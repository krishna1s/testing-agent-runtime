import type { NextApiRequest, NextApiResponse } from 'next'

interface CancelResponse {
  message: string
  cancelled: boolean
  task_id: string
  sdk_used: boolean
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
      // Try to use OpenCode SDK to abort the session
      const { createOpencodeClient } = await import('@opencode-ai/sdk')
      const client = createOpencodeClient()

      await client.session.abort({
        path: { id: taskId }
      })

      const response: CancelResponse = {
        message: `Task ${taskId} cancelled successfully`,
        cancelled: true,
        task_id: taskId,
        sdk_used: true
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error cancelling task:', error)
      
      // If the session doesn't exist, still return success
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(200).json({
          message: `Task ${taskId} was not found or already completed`,
          cancelled: true,
          task_id: taskId,
          sdk_used: true
        })
      }
      
      res.status(500).json({
        error: `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}