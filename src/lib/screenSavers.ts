import type { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import TimeScreenSaver from '@/components/screensavers/TimeScreenSaver'

const PipesScreenSaver = dynamic(
  () => import('@/components/screensavers/PipesScreenSaver'),
  { ssr: false },
)

export interface ScreenSaverMeta {
  id: string
  label: string
  component: ComponentType | null
}

export const SCREEN_SAVERS: ScreenSaverMeta[] = [
  { id: 'none', label: '(None)', component: null },
  { id: 'time', label: 'Time', component: TimeScreenSaver },
  { id: 'pipes', label: 'Pipes', component: PipesScreenSaver },
]

export function getScreenSaver(id: string): ScreenSaverMeta | undefined {
  return SCREEN_SAVERS.find(s => s.id === id)
}
