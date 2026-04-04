'use client'

import { AuthProvider } from '@/hooks/use-auth'
import { DesignProvider } from '@/hooks/use-design'
import { WorkflowProvider } from '@/hooks/use-workflow'
import { RouteGuard } from '@/components/route-guard'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DesignProvider>
        <WorkflowProvider>
          <RouteGuard>
            {children}
          </RouteGuard>
        </WorkflowProvider>
      </DesignProvider>
    </AuthProvider>
  )
}
