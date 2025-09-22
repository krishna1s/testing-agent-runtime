import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeAgentService, TaskType, TaskStatus } from '../../lib/opencode-agent-service'

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
  configuration: {
    app_url: string
    instructions?: string
  }
  session_id: string
  created_at: string
  updated_at: string
  messages_count: number
  opencode_session_id?: string
  server_connected: boolean
  server_url?: string
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

      // Create task using OpenCode Agent Service
      const taskSession = await opencodeAgentService.createTask({
        taskType: body.task_type,
        appUrl: body.configuration.app_url,
        instructions: body.configuration.instructions
      }, body.session_id);

      const response: TaskResponse = {
        id: taskSession.id,
        task_id: taskSession.taskId,
        task_type: taskSession.taskType,
        status: taskSession.status,
        configuration: {
          app_url: taskSession.appUrl,
          instructions: body.configuration.instructions
        },
        session_id: taskSession.id,
        created_at: taskSession.createdAt.toISOString(),
        updated_at: taskSession.updatedAt.toISOString(),
        messages_count: taskSession.messages.length,
        opencode_session_id: taskSession.opencodeSessionId,
        server_connected: opencodeAgentService.isConnected(),
        server_url: opencodeAgentService.getServerUrl() || undefined
      }

      res.status(201).json(response)
    } catch (error) {
      console.error('Error creating task:', error)
      res.status(500).json({
        error: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else if (req.method === 'GET') {
    try {
      // Return list of all tasks using OpenCode Agent Service
      const sessions = await opencodeAgentService.listTasks()
      
      const tasks: TaskResponse[] = sessions.map((session: any) => ({
        id: session.id,
        task_id: session.taskId,
        task_type: session.taskType,
        status: session.status,
        configuration: {
          app_url: session.appUrl
        },
        session_id: session.id,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        messages_count: session.messages.length,
        opencode_session_id: session.opencodeSessionId,
        server_connected: opencodeAgentService.isConnected(),
        server_url: opencodeAgentService.getServerUrl() || undefined
      }))

      res.status(200).json(tasks)
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