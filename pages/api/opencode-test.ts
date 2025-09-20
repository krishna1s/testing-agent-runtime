import type { NextApiRequest, NextApiResponse } from 'next'

type OpenCodeTestResponse = {
  sdk_available: boolean
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
      const { OpenCode } = await import('@opencode-ai/sdk')
      
      // Basic SDK test
      const response: OpenCodeTestResponse = {
        sdk_available: true,
        version: 'SDK imported successfully'
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('OpenCode SDK test error:', error)
      res.status(200).json({
        sdk_available: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}