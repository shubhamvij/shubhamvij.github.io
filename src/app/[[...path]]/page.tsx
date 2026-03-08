import { getSocialLinks } from '@/lib/social'
import { getSettings } from '@/lib/settings'
import { getAllPosts } from '@/lib/blog'
import HomeClient from './HomeClient'

export function generateStaticParams() {
  const posts = getAllPosts()
  return [
    { path: [] },
    { path: ['blog'] },
    { path: ['resume'] },
    { path: ['research'] },
    { path: ['about'] },
    ...posts.map(p => ({ path: ['blog', p.slug] })),
  ]
}

export default function Home() {
  const socialLinks = getSocialLinks()
  const settings = getSettings()
  return (
    <HomeClient
      socialLinks={socialLinks}
      defaultScreenSaver={settings.screenSaver.default}
      defaultIdleTimeout={settings.screenSaver.idleTimeout}
    />
  )
}
