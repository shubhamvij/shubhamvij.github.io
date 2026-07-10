'use client'
import { useState } from 'react'
import s from './gfm.module.css'

type Family = 'position' | 'kg' | 'anygraph' | 'text' | 'molecules' | 'relational' | 'scale' | 'algorithms'

const FAMILIES: { id: Family; label: string }[] = [
  { id: 'position', label: 'Position & surveys' },
  { id: 'kg', label: 'Knowledge graphs' },
  { id: 'anygraph', label: 'Any-graph node models' },
  { id: 'text', label: 'Text & LLM-based' },
  { id: 'molecules', label: 'Molecules & materials' },
  { id: 'relational', label: 'Relational databases' },
  { id: 'scale', label: 'Scaling & datasets' },
  { id: 'algorithms', label: 'Algorithmic reasoning' },
]

interface Paper {
  name: string
  href: string
  meta: string
  blurb: string
  family: Family
}

const PAPERS: Paper[] = [
  // Position & surveys
  { family: 'position', name: 'Position: Graph Foundation Models Are Already Here', href: 'https://arxiv.org/abs/2402.02216', meta: 'Mao et al. · ICML 2024', blurb: 'The "graph vocabulary" argument: GFMs need transferable units grounded in network analysis, expressiveness, and stability.' },
  { family: 'position', name: 'Graph Foundation Models: Concepts, Opportunities and Challenges', href: 'https://arxiv.org/abs/2310.11829', meta: 'Liu et al. · TPAMI 2025', blurb: 'The first big GFM survey (originally "Towards Graph Foundation Models"); taxonomizes GNN-based, LLM-based, and hybrid approaches.' },
  { family: 'position', name: 'Graph Foundation Models: A Comprehensive Survey', href: 'https://arxiv.org/abs/2505.15116', meta: 'Wang et al. · 2025', blurb: '93-page survey; names the three heterogeneity axes (feature / structure / task) and organizes GFMs into universal, task- and domain-specific.' },
  { family: 'position', name: 'Position: Graph Learning Will Lose Relevance Due To Poor Benchmarks', href: 'https://arxiv.org/abs/2502.14546', meta: 'Bechler-Speicher et al. · ICML 2025', blurb: 'Argues benchmark culture (tiny molecule datasets, fragmented evaluation) is what blocked useful GFMs; calls for relational DBs, chip design, combinatorial optimization.' },
  { family: 'position', name: 'On the Opportunities and Risks of Foundation Models', href: 'https://arxiv.org/abs/2108.07258', meta: 'Bommasani et al. · 2021', blurb: 'The report that coined "foundation model": broad pretraining, lightweight adaptation, emergence with scale.' },
  // Knowledge graphs
  { family: 'kg', name: 'ULTRA — Towards Foundation Models for Knowledge Graph Reasoning', href: 'https://arxiv.org/abs/2310.04562', meta: 'Galkin et al. · ICLR 2024', blurb: 'One model, any KG: builds a graph *of relations* (head/tail interactions) so no entity or relation vocabulary is baked in; zero-shot beats supervised baselines on 57 KGs.' },
  { family: 'kg', name: 'NBFNet — Neural Bellman-Ford Networks', href: 'https://arxiv.org/abs/2106.06935', meta: 'Zhu et al. · NeurIPS 2021', blurb: 'Path-based, embedding-free link prediction — the inductive engine ULTRA runs at both of its levels.' },
  { family: 'kg', name: 'UltraQuery — A Foundation Model for Zero-shot Logical Query Reasoning', href: 'https://arxiv.org/abs/2404.07198', meta: 'Galkin et al. · NeurIPS 2024', blurb: 'Extends ULTRA to multi-hop logical queries (∧, ∨, ¬) on any KG, zero-shot.' },
  { family: 'kg', name: 'TRIX — More Expressive Zero-shot Domain Transfer in KGs', href: 'https://arxiv.org/abs/2502.19512', meta: 'Zhang et al. · LoG 2024', blurb: 'Alternating entity/relation updates that provably beat ULTRA-style fixed relation interactions.' },
  { family: 'kg', name: 'How Expressive are Knowledge Graph Foundation Models?', href: 'https://arxiv.org/abs/2502.13339', meta: 'Huang et al. · ICML 2025', blurb: 'Theory: a KGFM\'s power is set by the relation *motifs* it uses; higher-order motifs (MOTIF) strictly subsume ULTRA.' },
  // Any-graph node models
  { family: 'anygraph', name: 'GraphAny — Fully-inductive Node Classification on Arbitrary Graphs', href: 'https://arxiv.org/abs/2405.20445', meta: 'Zhao et al. · ICLR 2025', blurb: 'Closed-form LinearGNNs solved on the fly + dimension-invariant attention; trained on one 120-node graph, works on 30+ unseen graphs.' },
  { family: 'anygraph', name: 'G2T-FM — Turning Tabular Foundation Models into GFMs', href: 'https://arxiv.org/abs/2508.20906', meta: 'Eremeev et al. · NeurIPS 2025', blurb: 'Node → table row (features + neighborhood aggregates + structural embeddings), then let TabPFNv2/LimiX do in-context learning.' },
  { family: 'anygraph', name: 'GraphPFN — A Prior-Data Fitted Graph Foundation Model', href: 'https://arxiv.org/abs/2509.21489', meta: 'Eremeev et al. · 2025', blurb: 'TabPFN-style: pretrain on millions of *synthetic* attributed graphs from a hand-designed prior, then predict in context on real ones.' },
  { family: 'anygraph', name: 'Bringing Graphs to the Table (TabGFM)', href: 'https://arxiv.org/abs/2509.07143', meta: 'Hayler et al. · 2025', blurb: 'Zero-shot node classification by ensembling tabular FMs over graph-derived tables.' },
  { family: 'anygraph', name: 'Equivariance Everywhere All At Once', href: 'https://arxiv.org/abs/2506.14291', meta: 'Finkelshtein et al. · 2025', blurb: 'First-principles recipe: which symmetries (node, label, feature permutations) a node-level GFM must respect, with universality proofs.' },
  { family: 'anygraph', name: 'OpenGraph — Towards Open Graph Foundation Models', href: 'https://arxiv.org/abs/2403.01121', meta: 'Xia et al. · EMNLP 2024', blurb: 'Unified graph tokenizer + graph transformer, pretrained partly on LLM-synthesized graphs.' },
  { family: 'anygraph', name: 'AnyGraph — Graph Foundation Model in the Wild', href: 'https://arxiv.org/abs/2408.10700', meta: 'Xia & Huang · 2024', blurb: 'Mixture-of-expert GNNs routed per input graph to absorb cross-domain structure/feature shift.' },
  // Text & LLM
  { family: 'text', name: 'OFA — One for All', href: 'https://arxiv.org/abs/2310.00149', meta: 'Liu et al. · ICLR 2024', blurb: 'Describe every node/edge in natural language, embed with one LM, and unify node/link/graph tasks via "nodes-of-interest" prompt graphs.' },
  { family: 'text', name: 'PRODIGY — Enabling In-context Learning Over Graphs', href: 'https://arxiv.org/abs/2305.12600', meta: 'Huang et al. · NeurIPS 2023', blurb: 'Few-shot task adaptation with no weight updates: examples and queries are wired into one "prompt graph" and message passing does the rest.' },
  { family: 'text', name: 'GraphGPT — Graph Instruction Tuning for LLMs', href: 'https://arxiv.org/abs/2310.13023', meta: 'Tang et al. · SIGIR 2024', blurb: 'Aligns a graph encoder to an LLM\'s token space, then instruction-tunes; strong zero-shot node/link transfer.' },
  { family: 'text', name: 'LLaGA — Large Language and Graph Assistant', href: 'https://arxiv.org/abs/2402.08170', meta: 'Chen et al. · ICML 2024', blurb: 'Templates that reorganize neighborhoods into structure-aware token sequences an unmodified LLM can consume.' },
  { family: 'text', name: 'UniGraph — Unified Cross-Domain TAG Foundation Model', href: 'https://arxiv.org/abs/2402.13630', meta: 'He et al. · KDD 2025', blurb: 'Cascaded LM+GNN with masked-graph modeling; text is the universal feature space.' },
  { family: 'text', name: 'GFT — Graph Foundation Model with Transferable Tree Vocabulary', href: 'https://arxiv.org/abs/2411.06070', meta: 'Wang et al. · NeurIPS 2024', blurb: 'Treats computation trees as the "words" of graphs: a quantized tree codebook shared across domains and tasks.' },
  { family: 'text', name: 'GQT — Learning Graph Quantized Tokenizers', href: 'https://arxiv.org/abs/2410.13798', meta: 'Wang et al. · ICLR 2025', blurb: 'Residual vector quantization turns nodes into a small discrete token vocabulary for graph Transformers.' },
  // Molecules & materials
  { family: 'molecules', name: 'JMP — From Molecules to Materials', href: 'https://arxiv.org/abs/2310.16802', meta: 'Shoghi et al. · ICLR 2024', blurb: 'Joint multi-domain pretraining on ~120M DFT-labeled structures; one model fine-tunes to SOTA on 34/40 atomistic tasks (+59% avg over scratch).' },
  { family: 'molecules', name: 'MACE-MP-0 — A foundation model for atomistic materials chemistry', href: 'https://arxiv.org/abs/2401.00096', meta: 'Batatia et al. · 2023', blurb: 'One equivariant force field trained on Materials Project trajectories runs stable MD across solids, liquids, and reactions out of the box.' },
  { family: 'molecules', name: 'GNoME — Scaling deep learning for materials discovery', href: 'https://www.nature.com/articles/s41586-023-06735-9', meta: 'Merchant et al. · Nature 2023', blurb: 'GNN stability predictors + active learning discover ~381K new stable crystals — the scaling-law success story for atomistic graphs.' },
  { family: 'molecules', name: 'UMA — A Family of Universal Models for Atoms', href: 'https://arxiv.org/abs/2506.23971', meta: 'Wood et al. (Meta FAIR) · 2025', blurb: 'Trained on ~500M structures; mixture-of-linear-experts gives 1.4B total / ~50M active params per structure.' },
  { family: 'molecules', name: 'MatterSim — Across Elements, Temperatures and Pressures', href: 'https://arxiv.org/abs/2405.04967', meta: 'Yang et al. (Microsoft) · 2024', blurb: 'Universal force field explicitly trained to cover 0–5000 K and up to 1000 GPa.' },
  { family: 'molecules', name: 'DPA-2 — a large atomic model as a multi-task learner', href: 'https://arxiv.org/abs/2312.15492', meta: 'Zhang et al. · npj Comp. Mater. 2024', blurb: 'Shared descriptor + per-dataset heads let heterogeneous DFT corpora co-train one backbone (the OpenLAM anchor).' },
  // Relational
  { family: 'relational', name: 'Relational Deep Learning', href: 'https://arxiv.org/abs/2312.04615', meta: 'Fey et al. · 2023', blurb: 'The blueprint: any relational database is a temporal heterogeneous graph (rows=nodes, foreign keys=edges) — no feature engineering.' },
  { family: 'relational', name: 'RelBench — A Benchmark for Deep Learning on Relational Databases', href: 'https://arxiv.org/abs/2407.20060', meta: 'Robinson et al. · NeurIPS 2024', blurb: 'Real databases + temporally split predictive tasks; RDL matches expert feature engineering with >10× less human work.' },
  { family: 'relational', name: 'KumoRFM — A Foundation Model for In-Context Learning on Relational Data', href: 'https://kumo.ai/research/kumo_relational_foundation_model.pdf', meta: 'Fey et al. (Kumo) · 2025', blurb: 'Pretrained relational graph transformer that answers arbitrary predictive queries (churn, LTV…) on any database, in context, in ~1s.' },
  { family: 'relational', name: 'KumoRFM-2 — Scaling Foundation Models for Relational Learning', href: 'https://arxiv.org/abs/2604.12596', meta: 'Hudovernik et al. · 2026', blurb: 'Billion-scale successor; first few-shot relational FM to beat supervised approaches across 41 benchmark tasks.' },
  { family: 'relational', name: 'Relational Transformer', href: 'https://arxiv.org/abs/2510.06377', meta: 'Ranjan et al. · ICLR 2026', blurb: 'Cell tokens + relational attention, masked-token pretraining on RelBench; zero-shot ≈94% of supervised AUROC at only ~22M params.' },
  { family: 'relational', name: 'Griffin — Towards a Graph-Centric Relational Database Foundation Model', href: 'https://arxiv.org/abs/2505.05568', meta: 'Wang et al. · ICML 2025', blurb: 'Unified encoder/decoder pretrained across databases (150M+ node graphs); strong low-data transfer.' },
  // Scaling & datasets
  { family: 'scale', name: 'Billion-Scale Graph Foundation Models (GraphBFF)', href: 'https://arxiv.org/abs/2602.04768', meta: 'Bechler-Speicher et al. (Meta) · 2026', blurb: 'The anchor paper of this guide: a 1.4B-param GFM on a ~50B node/edge enterprise graph, clean scaling laws, +31 PRAUC on unseen tasks.' },
  { family: 'scale', name: 'Towards Neural Scaling Laws on Graphs', href: 'https://arxiv.org/abs/2402.02054', meta: 'Liu et al. · 2024', blurb: 'Graph scaling behaves differently: depth changes the law, and data should be counted in nodes/edges, not #graphs.' },
  { family: 'scale', name: 'Do Neural Scaling Laws Exist on Graph Self-Supervised Learning?', href: 'https://arxiv.org/abs/2408.11243', meta: 'Ma et al. · LoG 2024', blurb: 'Cautionary negative result: SSL loss scales, downstream performance doesn\'t — pretext design dominates.' },
  { family: 'scale', name: 'OGB — Open Graph Benchmark', href: 'https://arxiv.org/abs/2005.00687', meta: 'Hu et al. · NeurIPS 2020', blurb: 'The standard graph benchmark suite, with realistic distribution-shift splits.' },
  { family: 'scale', name: 'OGB-LSC — A Large-Scale Challenge', href: 'https://arxiv.org/abs/2103.09430', meta: 'Hu et al. · KDD Cup 2021', blurb: 'MAG240M (244M nodes / 1.3B edges), WikiKG90M, PCQM4M — the biggest public graph learning datasets.' },
  { family: 'scale', name: 'IGB — Illinois Graph Benchmark', href: 'https://arxiv.org/abs/2302.13522', meta: 'Khatua et al. · KDD 2023', blurb: 'IGB-HET: 547M nodes / 5.8B edges with 162× more labels than prior datasets; now an MLPerf benchmark.' },
  { family: 'scale', name: 'TpuGraphs — Performance Prediction on Tensor Computation Graphs', href: 'https://arxiv.org/abs/2308.13490', meta: 'Phothilimthana et al. · NeurIPS 2023', blurb: 'Graph-level regression on real XLA graphs (avg 770× larger than prior graph-property datasets).' },
  // Algorithmic reasoning
  { family: 'algorithms', name: 'CLRS — The CLRS Algorithmic Reasoning Benchmark', href: 'https://arxiv.org/abs/2205.15659', meta: 'Veličković et al. · ICML 2022', blurb: '30 classic algorithms, all represented as graphs with step-by-step "hint" trajectories.' },
  { family: 'algorithms', name: 'A Generalist Neural Algorithmic Learner', href: 'https://arxiv.org/abs/2209.11142', meta: 'Ibarz et al. · LoG 2022', blurb: 'One GNN processor learns all 30 CLRS algorithms at once, matching single-task specialists — a proto-foundation-model for reasoning.' },
  { family: 'algorithms', name: 'TransNAR — Transformers meet Neural Algorithmic Reasoners', href: 'https://arxiv.org/abs/2406.09308', meta: 'Bounsi et al. · 2024', blurb: 'A pretrained graph reasoner as a "coprocessor" that language-model tokens cross-attend to.' },
]

export default function PaperShelf() {
  const [family, setFamily] = useState<Family | 'all'>('all')
  const shown = family === 'all' ? PAPERS : PAPERS.filter(p => p.family === family)
  const familyLabel = (id: Family) => FAMILIES.find(f => f.id === id)!.label

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Paper Shelf</span>
        <span className={s.widgetHint}>{shown.length} of {PAPERS.length} papers</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${family === 'all' ? s.chipOn : ''}`} onClick={() => setFamily('all')}>
            All
          </button>
          {FAMILIES.map(f => (
            <button key={f.id} type="button" className={`${s.chip} ${family === f.id ? s.chipOn : ''}`} onClick={() => setFamily(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className={s.paperGrid}>
          {shown.map(p => (
            <div key={p.href} className={s.paperCard}>
              <div className={s.paperName}>
                <a href={p.href} target="_blank" rel="noopener noreferrer">{p.name}</a>
              </div>
              <div className={s.paperMeta}>{p.meta}</div>
              <span className={s.paperTag}>{familyLabel(p.family)}</span>
              {p.blurb}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
