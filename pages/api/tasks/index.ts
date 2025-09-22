import type { NextApiRequest, NextApiResponse } from 'next'

// Define enums directly in this file for now
enum TaskType {
  COMPLETE = 'complete',
  PLAN = 'plan',
  GENERATE = 'generate',
  FIX = 'fix',
  RUN = 'run',
  CUSTOM = 'custom'
}

enum TaskStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

interface TaskRequest {
  task_type: TaskType
  configuration: {
    app_url: string
    instructions?: string
  }
  session_id: string
}

interface TaskResponse {
  id: string
  task_id: string
  task_type: TaskType
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
  sdk_used: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TaskResponse | TaskResponse[] | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const body = req.body as TaskRequest
      
      // Validate required fields
      if (!body.task_type || !body.configuration || !body.session_id) {
        return res.status(400).json({
          error: 'Missing required fields: task_type, configuration, session_id'
        })
      }

      // Validate task type
      if (!Object.values(TaskType).includes(body.task_type)) {
        return res.status(400).json({
          error: `Invalid task_type. Must be one of: ${Object.values(TaskType).join(', ')}`
        })
      }

      try {
        // Try to use OpenCode SDK
        const { createOpencodeClient } = await import('@opencode-ai/sdk')
        const client = createOpencodeClient()

        // Create a new OpenCode session
        const sessionResponse = await client.session.create({
          body: {
            title: `${body.task_type} - ${body.configuration.app_url}`,
          }
        })

        if (!sessionResponse.data) {
          throw new Error('Failed to create OpenCode session')
        }

        const session = sessionResponse.data
        const taskId = `task-${Date.now()}`
        const now = new Date()

        // Send initial prompt based on task type
        const prompts: Record<TaskType, string> = {
          [TaskType.COMPLETE]: `I need you to help me create a complete end-to-end test suite for the web application at ${body.configuration.app_url}.`,
          [TaskType.PLAN]: `I need you to analyze the web application at ${body.configuration.app_url} and create a comprehensive testing plan.`,
          [TaskType.GENERATE]: `I need you to generate automated tests for the web application at ${body.configuration.app_url}.`,
          [TaskType.FIX]: `I need you to help fix and improve existing tests for the web application at ${body.configuration.app_url}.`,
          [TaskType.RUN]: `I need you to run and execute tests for the web application at ${body.configuration.app_url}.`,
          [TaskType.CUSTOM]: body.configuration.instructions || `Please help me with testing tasks for the web application at ${body.configuration.app_url}.`
        }

        const prompt = prompts[body.task_type]
        const fullPrompt = body.configuration.instructions ? 
          `${prompt}\n\nAdditional instructions: ${body.configuration.instructions}` : 
          prompt

        // Send the initial prompt
        await client.session.prompt({
          path: { id: session.id },
          body: { 
            parts: [{ type: 'text', text: fullPrompt }]
          }
        })

        const response: TaskResponse = {
          id: session.id,
          task_id: taskId,
          task_type: body.task_type,
          status: TaskStatus.RUNNING,
          phase: 'planning',
          configuration: {
            app_url: body.configuration.app_url,
            instructions: body.configuration.instructions
          },
          session_id: session.id,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          messages_count: 1,
          sdk_used: true
        }

        res.status(201).json(response)

      } catch (sdkError) {
        console.error('OpenCode SDK error, falling back to mock task:', sdkError)
        
        // Fallback to mock task if SDK fails
        const task: TaskResponse = {
          id: `task-${Date.now()}`,
          task_id: `task-${Date.now()}`,
          task_type: body.task_type,
          status: TaskStatus.PENDING,
          phase: 'planning',
          configuration: body.configuration,
          session_id: body.session_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages_count: 0,
          sdk_used: false
        }

        res.status(201).json(task)
      }

    } catch (error) {
      console.error('Error creating task:', error)
      res.status(500).json({
        error: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else if (req.method === 'GET') {
    try {
      // Return empty list for now - in a real implementation we'd store the sessions
      res.status(200).json([])
    } catch (error) {
      console.error('Error listing tasks:', error)
      res.status(500).json({
        error: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}