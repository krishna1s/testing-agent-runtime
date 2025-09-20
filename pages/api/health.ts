import type { NextApiRequest, NextApiResponse } from 'next'
import { settings } from '../../lib/config'

type HealthResponse = {
  status: string
  timestamp: string
  version: string
  opencode_available: boolean
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      opencode_available: settings.opencodeAvailable
    })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}