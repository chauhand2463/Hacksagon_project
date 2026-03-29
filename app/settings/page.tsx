'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ChevronRight, Bell, Shield, Users, Zap, Check, Github, Globe, Mail, Key, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function SettingsPage() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState({
    deployments: true,
    failures: true,
    drift: true,
    reports: true,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your organization and preferences</p>
        </div>

        {/* Profile Card */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent border border-brand-500/20 p-6 mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-6">
            <img
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"}
              alt="Profile"
              className="w-20 h-20 rounded-2xl border-4 border-white/10 shadow-lg"
            />
            <div>
              <h2 className="text-xl font-bold text-white">{user?.name || 'Demo User'}</h2>
              <p className="text-neutral-400">{user?.email || 'demo@example.com'}</p>
              <p className="text-brand-400 text-sm mt-1 capitalize">{user?.provider || 'Demo'} account</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Organization */}
          <div className={`rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Organization</h2>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Organization Name', value: 'System2ML Team', icon: Globe },
                { label: 'Plan', value: 'Enterprise', icon: Zap },
                { label: 'Billing', value: 'Manage payment', icon: Users },
              ].map((item, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group hover:translate-x-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className={`rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Connected Accounts</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: 'GitHub', connected: true, icon: Github },
                { name: 'Google', connected: false, icon: Globe },
                { name: 'Email', connected: true, icon: Mail },
              ].map((account, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5 hover:border-brand-500/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <account.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{account.name}</p>
                      <p className="text-sm text-neutral-500">{account.connected ? 'Connected' : 'Not connected'}</p>
                    </div>
                  </div>
                  {account.connected ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Button variant="outline" size="sm" className="border-neutral-700">Connect</Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className={`rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'deployments', label: 'Pipeline Deployments', desc: 'Notify on successful deployments' },
                { key: 'failures', label: 'Failures & Errors', desc: 'Immediate alerts for failures' },
                { key: 'drift', label: 'Data Drift', desc: 'Alert on significant drift' },
                { key: 'reports', label: 'Weekly Reports', desc: 'Summary of system health' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer group p-3 rounded-xl hover:bg-white/5 transition-all">
                  <div>
                    <p className="font-medium text-white group-hover:text-brand-400 transition-colors">{item.label}</p>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                    className={`w-12 h-7 rounded-full transition-all duration-300 ${
                      notifications[item.key as keyof typeof notifications] 
                        ? 'bg-brand-500' 
                        : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${
                      notifications[item.key as keyof typeof notifications] 
                        ? 'translate-x-6' 
                        : 'translate-x-1'
                    }`} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className={`rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Two-Factor Authentication', value: 'Enabled', icon: Shield },
                { label: 'API Keys', value: 'Manage access', icon: Key },
                { label: 'Active Sessions', value: '2 active', icon: Users },
              ].map((item, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group hover:translate-x-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className={`rounded-2xl bg-red-500/5 border border-red-500/20 overflow-hidden transition-all duration-700 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="p-5 border-b border-red-500/20">
              <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
            </div>
            <div className="p-5">
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:scale-[1.02] transition-all"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Organization
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
