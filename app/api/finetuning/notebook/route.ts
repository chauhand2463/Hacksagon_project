import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// POST /api/finetuning/notebook — generate notebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${API_BASE}/api/finetuning/notebook/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()

    // Also directly return the .ipynb file as download
    if (body.download === true) {
      const notebookBlob = JSON.stringify(data.notebook, null, 2)
      return new NextResponse(notebookBlob, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${data.filename}"`,
        },
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Fine-tuning notebook generation error:', error)
    
    // Fallback: generate a basic notebook client-side if backend is down
    return NextResponse.json(
      { 
        error: 'Backend unavailable. Use the Download button to get your notebook.',
        fallback: true 
      },
      { status: 503 }
    )
  }
}

// GET /api/finetuning/notebook?action=models — list models
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    if (action === 'models') {
      const response = await fetch(`${API_BASE}/api/finetuning/models`)
      if (response.ok) return NextResponse.json(await response.json())
    }
    
    if (action === 'jobs') {
      const response = await fetch(`${API_BASE}/api/finetuning/jobs`)
      if (response.ok) return NextResponse.json(await response.json())
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
