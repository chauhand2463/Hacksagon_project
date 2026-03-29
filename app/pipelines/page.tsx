'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { fetchPipelines, executePipeline } from '@/lib/api'
import { Loader2, Plus, Search, Zap, ArrowUpRight, Clock, Play, MoreVertical, CheckCircle2, Activity, Layers, GitBranch } from 'lucide-react'
import Link from 'next/link'

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deployingId, setDeployingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadPipelines() {
      try {
        const data = await fetchPipelines()
        setPipelines(data || [])
      } catch (e) {
        console.error('Error loading pipelines:', e)
      } finally {
        setLoading(false)
      }
    }
    loadPipelines()
  }, [])

  const handleDeploy = async (pipelineId: string) => {
    setDeployingId(pipelineId)
    try {
      await executePipeline(pipelineId)
      const data = await fetchPipelines()
      setPipelines(data || [])
    } catch (e) {
      console.error('Failed to deploy pipeline:', e)
    } finally {
      setDeployingId(null)
    }
  }

  const filtered = pipelines.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.data_type?.toLowerCase().includes(search.toLowerCase())
  )

  const activePipelines = pipelines.filter(p => p.status === 'active').length
  const designedPipelines = pipelines.filter(p => p.status === 'designed').length

  const stats = [
    { label: 'Total Pipelines', value: pipelines.length, color: 'from-neutral-500 to-neutral-600', icon: Layers },
    { label: 'Active', value: activePipelines, color: 'from-emerald-500 to-emerald-600', icon: Activity },
    { label: 'Designed', value: designedPipelines, color: 'from-brand-500 to-brand-600', icon: GitBranch },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pipelines</h1>
            <p className="text-neutral-400">Manage and monitor your ML pipelines</p>
          </div>
          <Link href="/pipelines/new">
            <Button className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white shadow-lg shadow-brand-500/25 gap-2 hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
              New Pipeline
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="relative max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-brand-400 transition-colors" />
            <input
              type="text"
              placeholder="Search pipelines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-neutral-900/50 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all hover:border-white/20"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5 group hover:border-brand-500/30 transition-all duration-500 hover:scale-[1.02] ${mounted ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-neutral-400 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-20 rounded-2xl bg-neutral-900/30 border border-white/5 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-20 h-20 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-10 h-10 text-neutral-600" />
            </div>
            <p className="text-neutral-500 mb-2 font-medium">No pipelines found</p>
            <p className="text-neutral-600 text-sm mb-6">Create your first pipeline to get started</p>
            <Link href="/pipelines/new">
              <Button className="bg-brand-500 hover:bg-brand-600 hover:scale-105 transition-transform">
                Create Your First Pipeline
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((pipeline: any, i: number) => (
              <div
                key={pipeline.id}
                className={`group relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-300 hover:scale-[1.01] ${mounted ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-7 h-7 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{pipeline.name}</h3>
                      <p className="text-neutral-400 text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs">{pipeline.data_type}</span>
                        <span className="text-neutral-600">•</span>
                        <span>{pipeline.objective}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${pipeline.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      pipeline.status === 'designed' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                        'bg-neutral-700/10 text-neutral-400 border border-neutral-700/20'
                      }`}>
                      {pipeline.status || 'draft'}
                    </span>

                    {pipeline.status === 'designed' && (
                      <Button
                        size="sm"
                        onClick={() => handleDeploy(pipeline.id)}
                        disabled={deployingId !== null}
                        className="bg-brand-500 hover:bg-brand-600 text-white gap-2 hover:scale-105 transition-transform"
                      >
                        {deployingId === pipeline.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {deployingId === pipeline.id ? 'Deploying...' : 'Deploy'}
                      </Button>
                    )}

                    {pipeline.status === 'active' && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live
                      </span>
                    )}

                    <Link href={`/pipelines/${pipeline.id}`}>
                      <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 gap-2 hover:scale-105 transition-transform">
                        View
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 text-sm text-neutral-500">
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Deployment: {pipeline.deployment}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Retraining: {pipeline.retraining}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
