import type { NextApiRequest, NextApiResponse } from 'next'

// Basic task types for now
interface TaskRequest {
  task_type: string
  configuration: {
    app_url: string
    instructions?: string
  }
  session_id: string
}

interface TaskResponse {
  id: string
  task_type: string
  status: string
  configuration: any
  session_id: string
  created_at: string
  message?: string
}

export default function handler(
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

      // Create a mock task for now
      const task: TaskResponse = {
        id: `task-${Date.now()}`,
        task_type: body.task_type,
        status: 'pending',
        configuration: body.configuration,
        session_id: body.session_id,
        created_at: new Date().toISOString(),
        message: 'Task created successfully (TypeScript conversion working!)'
      }

      res.status(201).json(task)
    } catch (error) {
      console.error('Error creating task:', error)
      res.status(500).json({
        error: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  } else if (req.method === 'GET') {
    // Return list of tasks
    res.status(200).json([])
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}