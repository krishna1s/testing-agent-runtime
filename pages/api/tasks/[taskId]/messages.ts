import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeAgentService } from '../../../../lib/opencode-agent-service'

interface MessageRequest {
  message: string
}

interface MessageResponse {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  task_id: string
}

interface MessagesListResponse {
  messages: MessageResponse[]
  total_messages: number
  task_id: string
  server_connected: boolean
  server_url?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessageResponse | MessagesListResponse | { error: string }>
) {
  const { taskId } = req.query

  if (typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as MessageRequest
      
      if (!body.message || typeof body.message !== 'string') {
        return res.status(400).json({ error: 'Message content is required' })
      }

      // Send message using OpenCode Agent Service
      const taskMessage = await opencodeAgentService.sendMessage(taskId, body.message)

      const response: MessageResponse = {
        id: taskMessage.id,
        type: taskMessage.type,
        content: taskMessage.content,
        timestamp: taskMessage.timestamp.toISOString(),
        task_id: taskId
      }

      res.status(201).json(response)
    } catch (error) {
      console.error('Error sending message:', error)
      
      if (error instanceof Error && error.message.includes('Task not found')) {
        return res.status(404).json({ error: `Task not found: ${taskId}` })
      }
      
      res.status(500).json({
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else if (req.method === 'GET') {
    try {
      // Get all messages for the task using OpenCode Agent Service
      const messages = await opencodeAgentService.getMessages(taskId)

      const responseMessages: MessageResponse[] = messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        task_id: taskId
      }))

      const response: MessagesListResponse = {
        messages: responseMessages,
        total_messages: responseMessages.length,
        task_id: taskId,
        server_connected: opencodeAgentService.isConnected(),
        server_url: opencodeAgentService.getServerUrl() || undefined
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error getting messages:', error)
      
      if (error instanceof Error && error.message.includes('Task not found')) {
        return res.status(404).json({ error: `Task not found: ${taskId}` })
      }
      
      res.status(500).json({
        error: `Failed to get messages: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}