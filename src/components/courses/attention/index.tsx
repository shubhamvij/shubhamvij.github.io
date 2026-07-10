import type { CourseDefinition } from '../engine/types'
import { MODULES, COURSE_TITLE, COURSE_TAGLINE } from './content'
import AttentionLab from './AttentionLab'
import MultiHeadLab from './MultiHeadLab'
import TransformerBlockDiagram from './TransformerBlockDiagram'
import AttentionMaskLab from './AttentionMaskLab'
import PatchifyLab from './PatchifyLab'
import TypedAttentionLab from './TypedAttentionLab'
import OrderBlindLab from './OrderBlindLab'
import PositionLab from './PositionLab'
import HeadMatrixLab from './HeadMatrixLab'
import ResidualStreamLab from './ResidualStreamLab'
import ParamBudgetLab from './ParamBudgetLab'
import HeadShareLab from './HeadShareLab'
import FlashTilingLab from './FlashTilingLab'
import KvCacheLab from './KvCacheLab'

const MaskEfficiency = () => <AttentionMaskLab emphasis="efficiency" />
const MaskGraphs = () => <AttentionMaskLab emphasis="graphs" />

export const attentionCourse: CourseDefinition = {
  id: 'attention-mechanisms',
  title: COURSE_TITLE,
  tagline: COURSE_TAGLINE,
  storageKey: 'attention-course-progress-v1',
  modules: MODULES,
  widgets: {
    'attention-lab': AttentionLab,
    'multi-head': MultiHeadLab,
    'block-diagram': TransformerBlockDiagram,
    'mask-lab-efficiency': MaskEfficiency,
    'mask-lab-graphs': MaskGraphs,
    'patchify': PatchifyLab,
    'typed-attention': TypedAttentionLab,
    'order-blind': OrderBlindLab,
    'position-lab': PositionLab,
    'head-matrix': HeadMatrixLab,
    'residual-stream': ResidualStreamLab,
    'param-budget': ParamBudgetLab,
    'head-sharing': HeadShareLab,
    'flash-tiling': FlashTilingLab,
    'kv-cache': KvCacheLab,
  },
}
