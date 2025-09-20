import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Runtime API',
  description: 'TypeScript Agent Runtime API with OpenCode SDK integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}