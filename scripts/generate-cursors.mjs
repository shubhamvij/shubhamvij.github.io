import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'images', 'cursors')
mkdirSync(outDir, { recursive: true })

// All cursors designed at 32x32 for clarity, with clean Windows Aero style
const cursors = {
  // Classic Windows arrow — tip at (4,1), straight left edge, tail notch
  'aero_arrow.png': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="1" dy="1" stdDeviation="0.8" flood-opacity="0.4"/>
      </filter>
    </defs>
    <path d="M4,1 L4,23 L9,18 L13,27 L17,25 L13,17 L19,17 Z" fill="white" stroke="black" stroke-width="1.2" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,

  // Pointing hand — simple recognizable hand with index finger up
  'aero_link.png': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="1" dy="1" stdDeviation="0.8" flood-opacity="0.4"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <!-- Index finger -->
      <path d="M11,1 C9.5,1 8,2.5 8,4 L8,13 L6.5,11.5 C5.5,10.5 4,10 3,11 C2,12 2,13.5 3,14.5 L8,20 C9,22 11,25 14,25 L19,25 C23,25 25,22 25,18 L25,14 C25,12.5 24,11.5 22.5,11.5 C22,11.5 21.5,11.7 21,12 L21,11 C21,9.5 20,8.5 18.5,8.5 C18,8.5 17.5,8.7 17,9 L17,10 L17,8 C17,6.5 16,5.5 14.5,5.5 C14,5.5 13.5,5.7 13,6 L13,4 C13,2.5 12,1 11,1 Z" fill="white" stroke="black" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Finger separations -->
      <line x1="13" y1="12" x2="13" y2="17" stroke="#bbb" stroke-width="0.8"/>
      <line x1="17" y1="12" x2="17" y2="17" stroke="#bbb" stroke-width="0.8"/>
      <line x1="21" y1="14" x2="21" y2="17" stroke="#bbb" stroke-width="0.8"/>
    </g>
  </svg>`,

  // I-beam text cursor
  'aero_text.png': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22">
    <defs>
      <filter id="s" x="-30%" y="-10%" width="160%" height="120%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.4" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <path d="M4,1 Q8,1 8,4 L8,18 Q8,21 4,21" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12,1 Q8,1 8,4" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12,21 Q8,21 8,18" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="6" y1="11" x2="10" y2="11" stroke="black" stroke-width="1.2" stroke-linecap="round"/>
    </g>
  </svg>`,

  // Four-way move cursor
  'aero_move.png': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <defs>
      <filter id="s" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M12,2 L15,5 L13,5 L13,10 L18,10 L18,8 L21,11 L18,14 L18,12 L13,12 L13,18 L15,18 L12,21 L9,18 L11,18 L11,12 L6,12 L6,14 L3,11 L6,8 L6,10 L11,10 L11,5 L9,5 Z" fill="white" stroke="black" stroke-width="1" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,

  // Not-allowed / unavailable
  'aero_unavail.png': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <defs>
      <filter id="s" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <circle cx="12" cy="12" r="10" fill="white" stroke="#cc0000" stroke-width="2"/>
      <line x1="5.5" y1="17" x2="18.5" y2="7" stroke="#cc0000" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  </svg>`,

  // Horizontal resize (east-west)
  'aero_ew.png': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16">
    <defs>
      <filter id="s" x="-10%" y="-20%" width="130%" height="150%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M1,8 L5,4 L5,7 L19,7 L19,4 L23,8 L19,12 L19,9 L5,9 L5,12 Z" fill="white" stroke="black" stroke-width="1" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,

  // Vertical resize (north-south)
  'aero_ns.png': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" viewBox="0 0 16 24">
    <defs>
      <filter id="s" x="-20%" y="-10%" width="150%" height="130%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M8,1 L12,5 L9,5 L9,19 L12,19 L8,23 L4,19 L7,19 L7,5 L4,5 Z" fill="white" stroke="black" stroke-width="1" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,

  // Diagonal NE-SW resize
  'aero_nesw.png': `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <defs>
      <filter id="s" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M14,2 L20,2 L20,8 L18,6 L13,11 L18,16 L20,14 L20,20 L14,20 L16,18 L11,13 L6,18 L8,20 L2,20 L2,14 L4,16 L9,11 L4,6 L2,8 L2,2 L8,2 L6,4 L11,9 L16,4 Z" fill="white" stroke="black" stroke-width="1" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,

  // Diagonal NW-SE resize
  'aero_nwse.png': `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <defs>
      <filter id="s" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M8,2 L2,2 L2,8 L4,6 L9,11 L4,16 L2,14 L2,20 L8,20 L6,18 L11,13 L16,18 L14,20 L20,20 L20,14 L18,16 L13,11 L18,6 L20,8 L20,2 L14,2 L16,4 L11,9 L6,4 Z" fill="white" stroke="black" stroke-width="1" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`,
}

async function generate() {
  for (const [filename, svg] of Object.entries(cursors)) {
    const buf = Buffer.from(svg)
    const img = sharp(buf, { density: 72 })
    const meta = await img.metadata()
    await img
      .png()
      .toFile(join(outDir, filename))
    console.log(`Generated ${filename} (${meta.width}x${meta.height})`)
  }
  console.log('Done!')
}

generate().catch(console.error)
