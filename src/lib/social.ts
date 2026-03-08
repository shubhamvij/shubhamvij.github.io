import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

export interface SocialLink {
  id: string
  label: string
  icon: string
  href: string
}

export function getSocialLinks(): SocialLink[] {
  const filePath = path.join(process.cwd(), 'content', 'social.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return parse(fileContents) as SocialLink[]
}
