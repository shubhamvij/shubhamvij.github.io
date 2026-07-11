import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ZooMapLab from './ZooMapLab'
import RelationGraphLab from './RelationGraphLab'
import TextGlueLab from './TextGlueLab'
import ChannelEnsembleLab from './ChannelEnsembleLab'
import BffAnatomyLab from './BffAnatomyLab'
import LabelInjectionLab from './LabelInjectionLab'

describe('ZooMapLab', () => {
  it('compares ULTRA vs GraphBFF by default', () => {
    render(<ZooMapLab />)
    expect(screen.getByText('conditional MPNN (NBFNet-style)')).toBeDefined()
    expect(screen.getByText('graph transformer: TCA + TAA fused per block')).toBeDefined()
  })

  it('replaces the older selection first and marks identical rows as same', () => {
    render(<ZooMapLab />)
    fireEvent.click(screen.getByRole('button', { name: /LLaGA/ }))   // [GraphBFF, LLaGA]
    fireEvent.click(screen.getByRole('button', { name: /GraphGPT/ })) // [LLaGA, GraphGPT]
    // GraphGPT and LLaGA share prediction locus and frozen-vs-trained cells:
    expect(screen.getAllByText('· same ·').length).toBe(2)
    expect(screen.getAllByText('the LLM generates the answer').length).toBe(2)
  })

  it('points every card at a deep dive', () => {
    render(<ZooMapLab />)
    expect(screen.getAllByText(/deep dive 5\./).length).toBe(10)
  })
})

describe('RelationGraphLab', () => {
  it('builds relation-graph edges only when interaction chips are toggled on', () => {
    render(<RelationGraphLab />)
    expect(screen.getByText(/relation-graph edges/)).toBeDefined()
    const edgeStat = screen.getByText(/relation-graph edges/)
    expect(within(edgeStat).getByText('0')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /h2h/ }))
    // authored–affiliated (Ada, Bob head both) and cites–published-in (P1 heads both)
    const edgeStat2 = screen.getByText(/relation-graph edges/)
    expect(within(edgeStat2).getByText('2')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /t2t/ }))
    const edgeStat3 = screen.getByText(/relation-graph edges/)
    expect(within(edgeStat3).getByText('3')).toBeDefined()
  })

  it('propagates a query and ranks candidates deterministically', () => {
    render(<RelationGraphLab />)
    fireEvent.click(screen.getByRole('button', { name: /h2h/ }))
    fireEvent.click(screen.getByRole('button', { name: /t2h/ }))
    fireEvent.click(screen.getByRole('button', { name: /Propagate 1 step/ }))
    fireEvent.click(screen.getByRole('button', { name: /Propagate 1 step/ }))
    expect(screen.getByText(/top candidate:/)).toBeDefined()
    // Deterministic under the fixed weights; honest first run ranks Venue on top.
    expect(screen.getByText(/top candidate:/).textContent).toContain('Venue')
  })

  it('shows the zero-learned-embeddings stat', () => {
    render(<RelationGraphLab />)
    expect(screen.getByText(/learned per-relation embeddings/)).toBeDefined()
  })
})

describe('TextGlueLab', () => {
  it('starts on OFA: trained GNN, GNN predicts', () => {
    render(<TextGlueLab />)
    const trainedStat = screen.getByText(/^trained here:/)
    expect(within(trainedStat).getByText('the GNN + class-node MLP head')).toBeDefined()
    expect(screen.getByText('GNN predicts')).toBeDefined()
  })

  it('switches wirings and flips the frozen/trained readouts', () => {
    render(<TextGlueLab />)
    fireEvent.click(screen.getByRole('button', { name: 'GraphGPT' }))
    const trainedStatGraphGPT = screen.getByText(/^trained here:/)
    expect(within(trainedStatGraphGPT).getByText('the projector — nothing else')).toBeDefined()
    expect(screen.getByText('LLM predicts')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'LLaGA' }))
    expect(screen.getByText(/0 params/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'UniGraph' }))
    const trainedStatUniGraph = screen.getByText(/^trained here:/)
    expect(within(trainedStatUniGraph).getByText('LM + GNN jointly, end to end')).toBeDefined()
  })

  it('explains a slot on click', () => {
    render(<TextGlueLab />)
    fireEvent.click(screen.getByRole('button', { name: 'GraphGPT' }))
    fireEvent.click(screen.getByText('projector'))
    expect(screen.getByText(/single linear layer/)).toBeDefined()
  })
})

describe('ChannelEnsembleLab', () => {
  it('renders all five LinearGNN channels', () => {
    render(<ChannelEnsembleLab />)
    // getAllByText, not getByText: whichever channel is currently on top also appears
    // as the nested value inside the "top filter: <value>" stat, so that one name has
    // two matches. Same multi-match tolerance ZooMapLab's tests use above.
    for (const name of ['Linear', 'LinearSGC1', 'LinearSGC2', 'LinearHGC1', 'LinearHGC2']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('shows the U-shape: low-pass wins at the ends, identity/high-pass in the mixed middle', () => {
    render(<ChannelEnsembleLab />)
    const slider = screen.getByLabelText(/homophily/i)
    const topText = () => screen.getByText(/^top filter:/).textContent ?? ''
    fireEvent.change(slider, { target: { value: '0' } })   // 100% homophily: low-pass wins
    expect(topText()).toMatch(/LinearSGC/)
    fireEvent.change(slider, { target: { value: '6' } })   // ~57% homophily: mixed middle
    expect(topText()).toMatch(/LinearHGC|Linear\b/)
    expect(topText()).not.toMatch(/LinearSGC/)
    fireEvent.change(slider, { target: { value: '14' } })  // 0% homophily: cleanly bipartite —
    // ĀX becomes a perfect community-flip detector, so low-pass wins again.
    expect(topText()).toMatch(/LinearSGC/)
  })
})

describe('BffAnatomyLab', () => {
  it('steps through the five stages of one forward pass', () => {
    render(<BffAnatomyLab />)
    expect(screen.getByText(/1 · Per-node-type projection/i)).toBeDefined()
    const next = screen.getByRole('button', { name: /next ▸/i })
    fireEvent.click(next)
    expect(screen.getByText(/2 · TCA — type-conditioned attention/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/3 · TAA — type-agnostic attention/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/4 · Fusion Φ/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/5 · Masked-link head/i)).toBeDefined()
  })

  it('always shows where the parameters live', () => {
    render(<BffAnatomyLab />)
    expect(screen.getByText(/≈85% of 1.4B params/)).toBeDefined()
  })
})

describe('LabelInjectionLab', () => {
  it('injects context labels into the users table at step 1', () => {
    render(<LabelInjectionLab />)
    expect(screen.queryByText('churn?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /next ▸/i }))
    expect(screen.getByText('churn?')).toBeDefined()
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })

  it('ends frozen: prediction with zero weight updates', () => {
    render(<LabelInjectionLab />)
    const next = screen.getByRole('button', { name: /next ▸/i })
    for (let i = 0; i < 4; i++) fireEvent.click(next)
    expect(screen.getByText(/churn\(U4\) =/)).toBeDefined()
    expect(screen.getByText(/weights updated/)).toBeDefined()
    expect(screen.getByText('0', { selector: 'span' })).toBeDefined()
  })

  it('contrasts with the flatten-to-one-row pipeline', () => {
    render(<LabelInjectionLab />)
    fireEvent.click(screen.getByRole('button', { name: /flatten instead/i }))
    expect(screen.getAllByText(/task-conditioned extraction/).length).toBeGreaterThan(0)
  })
})
