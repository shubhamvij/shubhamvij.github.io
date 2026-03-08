'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// --- Constants ---
const GRID_SIZE = 20
const HALF = GRID_SIZE / 2
const TICK_INTERVAL = 0.08
const MAX_STRAIGHTS = 2000
const MAX_JOINTS = 800
const RESET_THRESHOLD = 0.6
const MAX_TEAPOTS = 50
const STRAIGHT_CHANCE = 0.7
const TEAPOT_CHANCE = 0.07
const MAX_STUCK = 3
const NUM_PIPES = 3

const PIPE_RADIUS = 0.15
const JOINT_RADIUS = 0.22

const PIPE_COLORS = [
  new THREE.Color(0xc0c0c0), // silver/gray
  new THREE.Color(0xcc2222), // red
  new THREE.Color(0x44aa44), // green
  new THREE.Color(0x66ccaa), // teal/seafoam green
  new THREE.Color(0x88dddd), // light cyan
  new THREE.Color(0xddcc33), // yellow/gold
  new THREE.Color(0xdd8822), // orange/gold
  new THREE.Color(0x558855), // dark green
]

const DIRECTIONS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
]

// --- Types ---
interface PipeState {
  position: [number, number, number]
  direction: [number, number, number]
  color: THREE.Color
  stuckCount: number
  isGrowing: boolean
  growProgress: number
  growTarget: [number, number, number] | null
  growSegmentIdx: number
}

interface TeapotData {
  position: THREE.Vector3
  color: THREE.Color
  rotation: THREE.Euler
  id: number
}

// --- Helpers ---
function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && z >= 0 && z < GRID_SIZE
}

function gridToWorld(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x - HALF + 0.5, y - HALF + 0.5, z - HALF + 0.5)
}

function randomColor(): THREE.Color {
  return PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)].clone()
}

function randomDirection(): [number, number, number] {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
}

function perpendicularDirections(dir: [number, number, number]): [number, number, number][] {
  return DIRECTIONS.filter(d => d[0] !== dir[0] || d[1] !== dir[1] || d[2] !== dir[2])
    .filter(d => d[0] !== -dir[0] || d[1] !== -dir[1] || d[2] !== -dir[2])
}

function buildStraightMatrix(from: THREE.Vector3, to: THREE.Vector3, progress: number = 1): THREE.Matrix4 {
  const m = new THREE.Matrix4()
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length() * progress
  const mid = new THREE.Vector3().addVectors(from, dir.clone().multiplyScalar(progress * 0.5))
  const q = new THREE.Quaternion()
  q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  m.compose(mid, q, new THREE.Vector3(1, len, 1))
  return m
}

// --- Shared Geometries (created lazily) ---
let cylinderGeom: THREE.CylinderGeometry | null = null
let sphereGeom: THREE.SphereGeometry | null = null
let teapotGeom: THREE.BufferGeometry | null = null
let pipeMaterial: THREE.MeshStandardMaterial | null = null

function getGeometries() {
  if (!cylinderGeom) {
    cylinderGeom = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, 1, 12)
    sphereGeom = new THREE.SphereGeometry(JOINT_RADIUS, 16, 12)
    pipeMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.4,
      roughness: 0.3,
    })
    teapotGeom = new THREE.DodecahedronGeometry(JOINT_RADIUS * 1.3, 1)
  }
  return { cylinderGeom: cylinderGeom!, sphereGeom: sphereGeom!, teapotGeom: teapotGeom!, pipeMaterial: pipeMaterial! }
}

function disposeGeometries() {
  cylinderGeom?.dispose()
  sphereGeom?.dispose()
  teapotGeom?.dispose()
  pipeMaterial?.dispose()
  cylinderGeom = null
  sphereGeom = null
  teapotGeom = null
  pipeMaterial = null
}

// --- Camera Setup (static, angled perspective like the classic screensaver) ---
function CameraSetup() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return null
}

// --- Main Scene ---
function PipesScene({ resetRef, onFadeRequest }: {
  resetRef: React.MutableRefObject<(() => void) | null>
  onFadeRequest: () => void
}) {
  const straightRef = useRef<THREE.InstancedMesh>(null)
  const jointRef = useRef<THREE.InstancedMesh>(null)
  const [teapots, setTeapots] = useState<TeapotData[]>([])
  const teapotIdRef = useRef(0)
  const onFadeRequestRef = useRef(onFadeRequest)
  onFadeRequestRef.current = onFadeRequest

  const stateRef = useRef({
    grid: new Set<string>(),
    pipes: [] as PipeState[],
    straightCount: 0,
    jointCount: 0,
    tickAccumulator: 0,
    initialized: false,
    fadingOut: false,
  })

  const spawnPipe = useCallback((grid: Set<string>): PipeState | null => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      const z = Math.floor(Math.random() * GRID_SIZE)
      if (!grid.has(posKey(x, y, z))) {
        grid.add(posKey(x, y, z))
        const color = randomColor()

        // Place start cap (sphere)
        const jRef = jointRef.current
        if (jRef && stateRef.current.jointCount < MAX_JOINTS) {
          const idx = stateRef.current.jointCount++
          const m = new THREE.Matrix4()
          m.setPosition(gridToWorld(x, y, z))
          jRef.setMatrixAt(idx, m)
          jRef.setColorAt(idx, color)
          jRef.instanceMatrix.needsUpdate = true
          if (jRef.instanceColor) jRef.instanceColor.needsUpdate = true
          jRef.count = stateRef.current.jointCount
        }

        return {
          position: [x, y, z],
          direction: randomDirection(),
          color,
          stuckCount: 0,
          isGrowing: false,
          growProgress: 0,
          growTarget: null,
          growSegmentIdx: -1,
        }
      }
    }
    return null
  }, [])

  const addStraightSegment = useCallback((from: [number, number, number], to: [number, number, number], color: THREE.Color, progress: number = 1): number => {
    const sRef = straightRef.current
    if (!sRef || stateRef.current.straightCount >= MAX_STRAIGHTS) return -1
    const idx = stateRef.current.straightCount++
    const fromW = gridToWorld(...from)
    const toW = gridToWorld(...to)
    sRef.setMatrixAt(idx, buildStraightMatrix(fromW, toW, progress))
    sRef.setColorAt(idx, color)
    sRef.instanceMatrix.needsUpdate = true
    if (sRef.instanceColor) sRef.instanceColor.needsUpdate = true
    sRef.count = stateRef.current.straightCount
    return idx
  }, [])

  const addBallJoint = useCallback((pos: [number, number, number], color: THREE.Color) => {
    const jRef = jointRef.current
    if (!jRef || stateRef.current.jointCount >= MAX_JOINTS) return
    const idx = stateRef.current.jointCount++
    const m = new THREE.Matrix4()
    m.setPosition(gridToWorld(...pos))
    jRef.setMatrixAt(idx, m)
    jRef.setColorAt(idx, color)
    jRef.instanceMatrix.needsUpdate = true
    if (jRef.instanceColor) jRef.instanceColor.needsUpdate = true
    jRef.count = stateRef.current.jointCount
  }, [])

  const addTeapot = useCallback((pos: [number, number, number], color: THREE.Color) => {
    setTeapots(prev => {
      if (prev.length >= MAX_TEAPOTS) return prev
      return [...prev, {
        position: gridToWorld(...pos),
        color: color.clone(),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ),
        id: teapotIdRef.current++,
      }]
    })
  }, [])

  const resetScene = useCallback(() => {
    const s = stateRef.current
    s.grid.clear()
    s.pipes = []
    s.straightCount = 0
    s.jointCount = 0
    s.tickAccumulator = 0
    s.fadingOut = false
    s.initialized = false

    if (straightRef.current) straightRef.current.count = 0
    if (jointRef.current) jointRef.current.count = 0
    setTeapots([])
  }, [])

  // Expose reset to parent via ref
  useEffect(() => {
    resetRef.current = resetScene
    return () => { resetRef.current = null }
  }, [resetScene, resetRef])

  const startGrowth = useCallback((pipe: PipeState, target: [number, number, number], newDir: [number, number, number], s: typeof stateRef.current) => {
    const dirChanged = newDir[0] !== pipe.direction[0] || newDir[1] !== pipe.direction[1] || newDir[2] !== pipe.direction[2]

    if (dirChanged) {
      // Ball joint at every turn, with rare teapot Easter egg
      if (Math.random() < TEAPOT_CHANCE) {
        addTeapot(pipe.position, pipe.color)
      } else {
        addBallJoint(pipe.position, pipe.color)
      }
    }

    s.grid.add(posKey(target[0], target[1], target[2]))
    pipe.growTarget = target
    pipe.direction = newDir
    pipe.isGrowing = true
    pipe.growProgress = 0
    pipe.growSegmentIdx = addStraightSegment(pipe.position, target, pipe.color, 0)
    pipe.stuckCount = 0
  }, [addStraightSegment, addBallJoint, addTeapot])

  const growStep = useCallback(() => {
    const s = stateRef.current
    if (s.fadingOut) return

    // Check reset threshold
    if (s.grid.size > GRID_SIZE * GRID_SIZE * GRID_SIZE * RESET_THRESHOLD) {
      s.fadingOut = true
      onFadeRequestRef.current?.()
      return
    }

    // Initialize pipes if needed
    if (!s.initialized) {
      for (let i = 0; i < NUM_PIPES; i++) {
        const pipe = spawnPipe(s.grid)
        if (pipe) s.pipes.push(pipe)
      }
      s.initialized = true
      return
    }

    // Grow each pipe
    for (let i = 0; i < s.pipes.length; i++) {
      const pipe = s.pipes[i]
      if (pipe.isGrowing) continue

      // Decide direction
      let newDir = pipe.direction
      if (Math.random() > STRAIGHT_CHANCE) {
        const perps = perpendicularDirections(pipe.direction)
        const shuffled = perps.sort(() => Math.random() - 0.5)
        for (const d of shuffled) {
          const nx = pipe.position[0] + d[0]
          const ny = pipe.position[1] + d[1]
          const nz = pipe.position[2] + d[2]
          if (inBounds(nx, ny, nz) && !s.grid.has(posKey(nx, ny, nz))) {
            newDir = d
            break
          }
        }
      }

      // Compute next position
      const nx = pipe.position[0] + newDir[0]
      const ny = pipe.position[1] + newDir[1]
      const nz = pipe.position[2] + newDir[2]

      if (inBounds(nx, ny, nz) && !s.grid.has(posKey(nx, ny, nz))) {
        startGrowth(pipe, [nx, ny, nz], newDir, s)
      } else {
        // Blocked - try all other directions
        let moved = false
        const allDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5)
        for (const d of allDirs) {
          if (d[0] === -pipe.direction[0] && d[1] === -pipe.direction[1] && d[2] === -pipe.direction[2]) continue
          const tx = pipe.position[0] + d[0]
          const ty = pipe.position[1] + d[1]
          const tz = pipe.position[2] + d[2]
          if (inBounds(tx, ty, tz) && !s.grid.has(posKey(tx, ty, tz))) {
            startGrowth(pipe, [tx, ty, tz], d, s)
            moved = true
            break
          }
        }
        if (!moved) {
          pipe.stuckCount++
          if (pipe.stuckCount >= MAX_STUCK) {
            addBallJoint(pipe.position, pipe.color)
            const newPipe = spawnPipe(s.grid)
            if (newPipe) {
              s.pipes[i] = newPipe
            } else {
              s.pipes.splice(i, 1)
              i--
            }
          }
        }
      }
    }

    // Ensure we have enough pipes
    while (s.pipes.length < NUM_PIPES) {
      const pipe = spawnPipe(s.grid)
      if (pipe) {
        s.pipes.push(pipe)
      } else {
        break
      }
    }
  }, [spawnPipe, startGrowth, addBallJoint])

  useFrame((_, delta) => {
    const s = stateRef.current
    if (s.fadingOut) return

    // Animate growing segments - each pipe tracks its own segment index
    let allDone = true
    for (const pipe of s.pipes) {
      if (pipe.isGrowing && pipe.growTarget && pipe.growSegmentIdx >= 0) {
        pipe.growProgress = Math.min(1, pipe.growProgress + delta / TICK_INTERVAL)
        const sRef = straightRef.current
        if (sRef) {
          const fromW = gridToWorld(...pipe.position)
          const toW = gridToWorld(...pipe.growTarget)
          sRef.setMatrixAt(pipe.growSegmentIdx, buildStraightMatrix(fromW, toW, pipe.growProgress))
          sRef.instanceMatrix.needsUpdate = true
        }
        if (pipe.growProgress >= 1) {
          pipe.position = pipe.growTarget
          pipe.isGrowing = false
          pipe.growTarget = null
          pipe.growSegmentIdx = -1
        } else {
          allDone = false
        }
      }
    }

    // Tick for new growth
    s.tickAccumulator += delta
    if (s.tickAccumulator >= TICK_INTERVAL && (allDone || !s.initialized)) {
      s.tickAccumulator -= TICK_INTERVAL
      if (s.tickAccumulator > TICK_INTERVAL) s.tickAccumulator = 0
      growStep()
    }
  })

  const { cylinderGeom: cGeom, sphereGeom: sGeom, teapotGeom: tpGeom, pipeMaterial: pMat } = getGeometries()

  return (
    <>
      <CameraSetup />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 15]} intensity={2.0} />
      <directionalLight position={[-8, -5, -10]} intensity={0.8} color="#aaccff" />
      <directionalLight position={[0, -10, 5]} intensity={0.5} color="#ffddaa" />
      <pointLight position={[0, 10, 0]} intensity={1.5} distance={50} />

      <instancedMesh ref={straightRef} args={[cGeom, pMat, MAX_STRAIGHTS]} frustumCulled={false} />
      <instancedMesh ref={jointRef} args={[sGeom, pMat, MAX_JOINTS]} frustumCulled={false} />

      {teapots.map(t => (
        <mesh key={t.id} position={t.position} rotation={t.rotation} geometry={tpGeom}>
          <meshStandardMaterial color={t.color} metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </>
  )
}

// --- Main Component ---
export default function PipesScreenSaver() {
  const [fadeOpacity, setFadeOpacity] = useState(0)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetRef = useRef<(() => void) | null>(null)

  const handleFadeRequest = useCallback(() => {
    setFadeOpacity(1)
    fadeTimeoutRef.current = setTimeout(() => {
      resetRef.current?.()
      setTimeout(() => setFadeOpacity(0), 100)
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
      disposeGeometries()
    }
  }, [])

  return (
    <div className="absolute inset-0 bg-black">
      <Canvas camera={{ position: [5, 3, 8], fov: 50 }} gl={{ antialias: true }}>
        <PipesScene resetRef={resetRef} onFadeRequest={handleFadeRequest} />
      </Canvas>
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          opacity: fadeOpacity,
          transition: 'opacity 1s ease-in-out',
        }}
      />
    </div>
  )
}
