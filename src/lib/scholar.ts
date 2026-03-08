import axios from 'axios'
import * as cheerio from 'cheerio'

const SCHOLAR_URL = 'https://scholar.google.com/citations?user=Z6f8FFYAAAAJ&hl=en'

export interface ScholarPublication {
  title: string
  authors: string
  venue: string
  year: string
  citations: string
  link: string
}

export async function fetchScholarData(): Promise<ScholarPublication[]> {
  const { data } = await axios.get(SCHOLAR_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const $ = cheerio.load(data)
  const publications: ScholarPublication[] = []

  $('#gsc_a_b .gsc_a_tr').each((_, el) => {
    const titleEl = $(el).find('.gsc_a_t a')
    const title = titleEl.text()
    const link = 'https://scholar.google.com' + titleEl.attr('href')
    const grayTexts = $(el).find('.gs_gray')
    const authors = grayTexts.eq(0).text()
    const venue = grayTexts.eq(1).text()
    const year = $(el).find('.gsc_a_y span').text()
    const citations = $(el).find('.gsc_a_c a').text()

    if (title) {
      publications.push({ title, authors, venue, year, citations, link })
    }
  })

  return publications
}
