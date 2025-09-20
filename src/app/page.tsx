export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Agent Runtime API</h1>
        <p className="text-lg mb-8">TypeScript Agent Runtime API with OpenCode SDK integration</p>
        <div className="space-y-2">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>API Documentation:</strong> <a href="/api" className="text-blue-600 hover:underline">/api</a></p>
          <p><strong>Health Check:</strong> <a href="/api/health" className="text-blue-600 hover:underline">/api/health</a></p>
        </div>
      </div>
    </main>
  )
}