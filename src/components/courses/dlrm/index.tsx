import type { CourseDefinition } from '../engine/types'
import { MODULES, COURSE_TITLE, COURSE_TAGLINE } from './content'
import LookupLab from './LookupLab'
import ParamFlopLab from './ParamFlopLab'
import TableSizerLab from './TableSizerLab'
import ShardShuffleLab from './ShardShuffleLab'
import CollisionLab from './CollisionLab'
import InteractionOrdersLab from './InteractionOrdersLab'

export const dlrmCourse: CourseDefinition = {
  id: 'dlrm-embedding-tables',
  title: COURSE_TITLE,
  tagline: COURSE_TAGLINE,
  storageKey: 'dlrm-course-progress-v1',
  modules: MODULES,
  widgets: {
    'lookup': LookupLab,
    'param-flop': ParamFlopLab,
    'table-sizer': TableSizerLab,
    'shard-shuffle': ShardShuffleLab,
    'qr-collide': CollisionLab,
    'interaction-orders': InteractionOrdersLab,
  },
}
