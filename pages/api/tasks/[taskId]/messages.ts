import type { NextApiRequest, NextApiResponse } from 'next'

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
  sdk_used: boolean
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

      try {
        // Try to use OpenCode SDK
        const { createOpencodeClient } = await import('@opencode-ai/sdk')
        const client = createOpencodeClient()

        // Send message to OpenCode session
        const response = await client.session.prompt({
          path: { id: taskId },
          body: { 
            parts: [{ type: 'text', text: body.message }]
          }
        })

        if (!response.data) {
          throw new Error('Failed to send message')
        }

        const assistantMessage = response.data.info
        const parts = response.data.parts

        // Extract content from parts
        let content = ''
        if (parts && parts.length > 0) {
          for (const part of parts) {
            if (part.type === 'text' && 'text' in part) {
              content += part.text + '\n'
            }
          }
        }

        const messageResponse: MessageResponse = {
          id: assistantMessage.id,
          type: 'assistant',
          content: content.trim() || 'Message received',
          timestamp: new Date(assistantMessage.time.created).toISOString(),
          task_id: taskId
        }

        res.status(201).json(messageResponse)

      } catch (sdkError) {
        console.error('OpenCode SDK error:', sdkError)
        return res.status(500).json({
          error: `Failed to send message via SDK: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`
        })
      }

    } catch (error) {
      console.error('Error sending message:', error)
      res.status(500).json({
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else if (req.method === 'GET') {
    try {
      // Try to get messages using OpenCode SDK
      const { createOpencodeClient } = await import('@opencode-ai/sdk')
      const client = createOpencodeClient()

      const response = await client.session.messages({
        path: { id: taskId }
      })

      if (!response.data) {
        return res.status(200).json({
          messages: [],
          total_messages: 0,
          task_id: taskId,
          sdk_used: true
        })
      }

      // Convert OpenCode messages to our format
      const messages: MessageResponse[] = response.data.map((msgData: any) => {
        let content = ''
        if (msgData.parts && msgData.parts.length > 0) {
          for (const part of msgData.parts) {
            if (part.type === 'text' && 'text' in part) {
              content += part.text + '\n'
            }
          }
        }

        return {
          id: msgData.info.id,
          type: msgData.info.role === 'user' ? 'user' : 'assistant',
          content: content.trim() || 'Message received',
          timestamp: new Date(msgData.info.time.created).toISOString(),
          task_id: taskId
        }
      })

      const messagesResponse: MessagesListResponse = {
        messages,
        total_messages: messages.length,
        task_id: taskId,
        sdk_used: true
      }

      res.status(200).json(messagesResponse)

    } catch (error) {
      console.error('Error getting messages:', error)
      
      if (error instanceof Error && error.message.includes('Session not found')) {
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