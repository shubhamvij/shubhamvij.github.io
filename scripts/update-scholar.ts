import fs from 'fs'
import path from 'path'
import { stringify } from 'yaml'
import { fetchScholarData } from '../src/lib/scholar'

const SCHOLAR_YAML = path.join(process.cwd(), 'content', 'scholar.yaml')

async function main() {
  const publications = await fetchScholarData()
  fs.writeFileSync(SCHOLAR_YAML, stringify(publications))
  console.log(`[update-scholar] Updated ${SCHOLAR_YAML} with ${publications.length} publications`)
}

main().catch(err => {
  console.warn('[update-scholar] Scraping failed, keeping existing data:', err.message)
})
