import type { CourseDefinition } from '../engine/types'
import { MODULES, GUIDE_TITLE, GUIDE_TAGLINE } from './content'
import MessagePassingLab from './MessagePassingLab'
import FeatureSpaceLab from './FeatureSpaceLab'
import HomophilyLab from './HomophilyLab'
import ScalingLab from './ScalingLab'
import TaskMatcher from './TaskMatcher'
import PaperShelf from './PaperShelf'
import ZooMapLab from './ZooMapLab'
import RelationGraphLab from './RelationGraphLab'
import TextGlueLab from './TextGlueLab'
import ChannelEnsembleLab from './ChannelEnsembleLab'
import BffAnatomyLab from './BffAnatomyLab'
import LabelInjectionLab from './LabelInjectionLab'

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
    'zoo-map': ZooMapLab,
    'relation-graph': RelationGraphLab,
    'text-glue': TextGlueLab,
    'channel-ensemble': ChannelEnsembleLab,
    'bff-anatomy': BffAnatomyLab,
    'label-injection': LabelInjectionLab,
  },
}
