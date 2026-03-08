import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

export interface Settings {
  screenSaver: {
    default: string
    idleTimeout: number
  }
}

export function getSettings(): Settings {
  const filePath = path.join(process.cwd(), 'content', 'settings.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return parse(fileContents) as Settings
}
