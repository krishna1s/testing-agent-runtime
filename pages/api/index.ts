import type { NextApiRequest, NextApiResponse } from 'next'

type RootResponse = {
  message: string
  version: string
  docs: string
  health: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<RootResponse>
) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Agent Runtime API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health'
    })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}