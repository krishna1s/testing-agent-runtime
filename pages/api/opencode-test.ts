import type { NextApiRequest, NextApiResponse } from 'next'
import { opencodeServerManager } from '../../lib/opencode-server'

type OpenCodeTestResponse = {
  sdk_available: boolean
  server_running: boolean
  server_url?: string
  version?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpenCodeTestResponse>
) {
  if (req.method === 'GET') {
    try {
      // Try to import and test the OpenCode SDK
      const { createOpencodeClient, createOpencodeServer } = await import('@opencode-ai/sdk')
      
      const response: OpenCodeTestResponse = {
        sdk_available: true,
        server_running: opencodeServerManager.isServerRunning(),
        server_url: opencodeServerManager.getServerUrl() || undefined,
        version: 'OpenCode SDK imported successfully'
      }

      // If server is not running, try to start it
      if (!response.server_running) {
        try {
          const serverUrl = await opencodeServerManager.startServer()
          response.server_running = true
          response.server_url = serverUrl
          response.version = `OpenCode server started at ${serverUrl}`
        } catch (serverError) {
          response.error = `Server start failed: ${serverError instanceof Error ? serverError.message : String(serverError)}`
        }
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('OpenCode SDK test error:', error)
      res.status(200).json({
        sdk_available: false,
        server_running: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}