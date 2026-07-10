import type { CourseDefinition } from '../engine/types'
import { MODULES, GUIDE_TITLE, GUIDE_TAGLINE } from './content'
import MessagePassingLab from './MessagePassingLab'
import FeatureSpaceLab from './FeatureSpaceLab'
import HomophilyLab from './HomophilyLab'
import ScalingLab from './ScalingLab'
import TaskMatcher from './TaskMatcher'
import PaperShelf from './PaperShelf'

const ScalingLaws = () => <ScalingLab initialView="laws" />
const DataGap = () => <ScalingLab initialView="gap" />

export const gfmCourse: CourseDefinition = {
  id: 'graph-foundation-models',
  title: GUIDE_TITLE,
  tagline: GUIDE_TAGLINE,
  // Predates the multi-course engine — keep so early readers retain progress.
  storageKey: 'gfm-guide-progress-v1',
  modules: MODULES,
  widgets: {
    'message-passing': MessagePassingLab,
    'feature-space': FeatureSpaceLab,
    'homophily': HomophilyLab,
    'scaling-laws': ScalingLaws,
    'data-gap': DataGap,
    'task-matcher': TaskMatcher,
    'paper-shelf': PaperShelf,
  },
}
