import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ZooMapLab from './ZooMapLab'
import RelationGraphLab from './RelationGraphLab'
import TextGlueLab from './TextGlueLab'
import ChannelEnsembleLab from './ChannelEnsembleLab'

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
    for (const name of ['Linear', 'LinearSGC1', 'LinearSGC2', 'LinearHGC1', 'LinearHGC2']) {
      expect(screen.getByText(name)).toBeDefined()
    }
  })

  it('shifts the trusted filter as homophily drops', () => {
    render(<ChannelEnsembleLab />)
    const slider = screen.getByLabelText(/homophily/i)
    fireEvent.change(slider, { target: { value: '0' } })   // 100% homophily
    const topAtHomophily = screen.getByText(/top filter:/).textContent
    expect(topAtHomophily).toMatch(/LinearSGC/)
    fireEvent.change(slider, { target: { value: '14' } })  // 0% homophily
    const topAtHeterophily = screen.getByText(/top filter:/).textContent
    // Paper: heterophilic graphs prefer LinearHGC1, Linear or LinearSGC1 —
    // the toy graph lands on one of the identity/high-pass channels.
    expect(topAtHeterophily).toMatch(/LinearHGC|Linear\b/)
    expect(topAtHeterophily).not.toBe(topAtHomophily)
  })
})
