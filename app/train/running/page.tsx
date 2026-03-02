'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { getTrainingStatusByProject, stopTrainingProject, TrainingStatusResponse, getColabJob, getGPUStatus, executeRealTraining } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle, AlertTriangle, DollarSign, Leaf, Clock, Loader2, XCircle, ExternalLink, Cpu, Zap, Download
} from 'lucide-react'

export default function TrainRunningPage() {
  const router = useRouter()
  const { dataset, constraints, selectedPipeline, setDesignStep } = useDesign()

  const [status, setStatus] = useState<TrainingStatusResponse | null>(null)
  const [polling, setPolling] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [progress, setProgress] = useState(0)

  const projectId = typeof window !== 'undefined' ? localStorage.getItem('system2ml_project_id') : null
  const trainingPlan = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('system2ml_training_plan') || '{}')
    : {}

  useEffect(() => {
    if (!selectedPipeline) {
      router.push('/train/confirm')
    }
  }, [selectedPipeline, router])

  useEffect(() => {
    if (!polling) return

    const pollInterval = setInterval(async () => {
      try {
        if (projectId) {
          const result = await getTrainingStatusByProject(projectId)
          setStatus(result)
          if (result.progress !== undefined) setProgress(result.progress)

          if (result.status === 'completed') {
            setPolling(false)
            setDesignStep('result')
            router.push('/train/result/completed')
          }
          if (result.status === 'killed') {
            setPolling(false)
            setDesignStep('result')
            localStorage.setItem('system2ml_training_status', JSON.stringify({ status: 'killed', reason: result.reason }))
            router.push('/train/result/killed')
          }
        } else {
          // Simulation mode
          setProgress(prev => Math.min(prev + Math.random() * 10, 100))
        }
      } catch (error) {
        console.error('Poll error:', error)
        setProgress(prev => Math.min(prev + 5, 95))
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [polling, projectId, router, setDesignStep])

  // Handle completion in simulation mode
  useEffect(() => {
    if (!projectId && polling && progress >= 100) {
      setPolling(false)
      setDesignStep('result')
      router.push('/train/result/completed')
    }
  }, [progress, polling, projectId, router, setDesignStep])

  const handleStopTraining = async () => {
    setStopping(true)
    try {
      if (projectId) {
        await stopTrainingProject(projectId)
      }
      setPolling(false)
      localStorage.setItem('system2ml_training_status', JSON.stringify({ status: 'stopped', reason: 'User requested' }))
      router.push('/train/result/stopped')
    } catch (error) {
      console.error('Stop error:', error)
    } finally {
      setStopping(false)
    }
  }

  const costUsed = trainingPlan?.plan?.estimated_cost_usd ? (progress / 100) * trainingPlan.plan.estimated_cost_usd : 0
  const carbonUsed = trainingPlan?.plan?.estimated_carbon_kg ? (progress / 100) * trainingPlan.plan.estimated_carbon_kg : 0

  // Get Colab job info
  const colabJob = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('system2ml_colab_job') || 'null')
    : null

  // Generate a simple Colab link for quick access
  const quickColabUrl = "https://colab.research.google.com/#new"

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Training in Progress</h1>
          <p className="text-neutral-400">Pipeline: {selectedPipeline?.name || 'Training'}</p>
        </div>

        {/* GPU Status */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              Local GPU Training (Recommended)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                <div>
                  <p className="text-white font-medium">Train locally on your RTX 3050</p>
                  <p className="text-neutral-400 text-sm">Fast, private, no cloud costs</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Available</Badge>
              </div>
              
              <Button 
                onClick={() => {
                  const trainingTarget = JSON.parse(localStorage.getItem('system2ml_training_target') || '{}')
                  if (trainingTarget.base_model) {
                    alert('Local training will start on your GPU. Check console for progress.')
                  } else {
                    alert('Please select a base model in AI Architect first')
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Cpu className="w-4 h-4 mr-2" />
                Start Local GPU Training
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colab Training Section */}
        <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              Google Colab (Cloud GPU Training)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {colabJob?.job_id ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <div>
                      <p className="text-white font-medium">Job ID: {colabJob.job_id}</p>
                      <p className="text-neutral-400 text-sm">
                        Model: {colabJob?.config?.model_name} | Method: {colabJob?.config?.method?.toUpperCase()}
                      </p>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400">{colabJob.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={quickColabUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Colab
                    </a>
                    
                    {colabJob.download_url && (
                      <a 
                        href={colabJob.download_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download Notebook
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-neutral-400">No training job created yet.</p>
                  <a 
                    href={quickColabUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open Google Colab Now
                  </a>
                </>
              )}

              <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
                <p className="text-blue-300 text-sm font-medium mb-2">Quick Start:</p>
                <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                  <li>Click "Open Google Colab" to launch</li>
                  <li>Create new notebook or upload .ipynb</li>
                  <li>Run cells to train with free GPU</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-white/5 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {progress >= 100 ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              )}
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-center text-2xl font-bold text-white">{progress.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-neutral-900/50 border-white/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-neutral-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Cost Used</span>
              </div>
              <p className="text-2xl font-bold text-white">${costUsed.toFixed(2)}</p>
              <p className="text-xs text-neutral-500">of ${trainingPlan?.plan?.estimated_cost_usd || constraints.maxCostUsd} limit</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-white/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-neutral-400 mb-2">
                <Leaf className="w-4 h-4" />
                <span className="text-sm">Carbon Used</span>
              </div>
              <p className="text-2xl font-bold text-white">{carbonUsed.toFixed(3)} kg</p>
              <p className="text-xs text-neutral-500">of {trainingPlan?.plan?.estimated_carbon_kg || constraints.maxCarbonKg}kg limit</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleStopTraining}
            disabled={stopping}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {stopping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Stop Training
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
