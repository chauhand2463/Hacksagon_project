import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const source_format = formData.get('source_format') as string || 'csv'
  const target_format = formData.get('target_format') as string || 'jsonl'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  try {
    const backendFormData = new FormData()
    backendFormData.append('file', file)
    backendFormData.append('source_format', source_format)
    backendFormData.append('target_format', target_format)

    const response = await fetch(`${API_BASE}/api/dataset/convert`, {
      method: 'POST',
      body: backendFormData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Conversion failed' }))
      return NextResponse.json(error, { status: response.status })
    }

    const result = await response.blob()
    return new NextResponse(result, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="converted.${target_format}"`,
      },
    })

  } catch (e: any) {
    console.error('Dataset convert error:', e.message)
    return NextResponse.json(
      { error: `Failed to convert dataset: ${e.message}` },
      { status: 502 }
    )
  }
}
