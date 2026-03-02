import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET() {
    try {
        const result = execSync('nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader', {
            encoding: 'utf-8',
            timeout: 10000
        })
        
        const [name, total, free] = result.trim().split(',').map(s => s.trim())
        
        return NextResponse.json({
            available: true,
            name,
            memory_total: total,
            memory_free: free,
            cuda_version: '12.x'
        })
    } catch (error) {
        return NextResponse.json({
            available: false,
            message: 'No GPU detected. Use Colab for GPU training.'
        })
    }
}
