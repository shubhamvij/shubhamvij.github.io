---
title: "Graph Foundation Models: An Interactive Study Guide"
date: "2026-07-09"
description: "A brilliant.org-style interactive course on Graph Foundation Models — message passing, the heterogeneity trilemma, the GFM zoo, and the billion-scale frontier. Seven modules with hands-on labs, quizzes, and 40+ referenced papers."
tags: ["graph neural networks", "foundation models", "GNN", "machine learning", "GFM", "interactive", "study guide"]
interactive: "gfm-study-guide"
---

# Graph Foundation Models: An Interactive Study Guide

This post is an interactive study guide — open it on the site to get the hands-on
labs, quizzes, and progress tracking. The outline and reading list below are the
static version of the same material.

## Module 1 — Graphs are everywhere

Nodes, edges, features, and types. Molecules, social and payment networks,
citation graphs, knowledge graphs, road networks, computation graphs — and the
observation that every relational database is a temporal heterogeneous graph
(rows are nodes, foreign keys are edges). Sequences and grids are special-case
graphs, which is why LLMs and ViTs can be seen as foundation models over trivial
topologies.

- A Gentle Introduction to Graph Neural Networks (Distill, 2021): https://distill.pub/2021/gnn-intro/
- Stanford CS224W: https://web.stanford.edu/class/cs224w/
- Geometric Deep Learning proto-book: https://geometricdeeplearning.com

## Module 2 — How machines learn on graphs

Message passing in three steps (collect, aggregate, update); k layers = k-hop
receptive field; over-smoothing; the GNN family tree: GCN, GraphSAGE (inductive),
GAT (attention), GIN (Weisfeiler-Lehman expressiveness), graph transformers.

- GCN — Kipf & Welling: https://arxiv.org/abs/1609.02907
- GraphSAGE — Hamilton et al.: https://arxiv.org/abs/1706.02216
- GAT — Veličković et al.: https://arxiv.org/abs/1710.10903
- GIN — Xu et al.: https://arxiv.org/abs/1810.00826
- Understanding Convolutions on Graphs (Distill): https://distill.pub/2021/understanding-gnns/

## Module 3 — The foundation-model recipe

The five ingredients that made LLMs work: a shared token vocabulary, a
self-supervised objective, a scalable architecture, predictable scaling laws,
and oceans of public data — plus in-context learning as the emergent payoff.

- Foundation models report — Bommasani et al.: https://arxiv.org/abs/2108.07258
- GPT-3 — Brown et al.: https://arxiv.org/abs/2005.14165
- Scaling laws — Kaplan et al.: https://arxiv.org/abs/2001.08361
- TabPFN — Hollmann et al.: https://arxiv.org/abs/2207.01848

## Module 4 — Why graphs break the recipe

The heterogeneity trilemma: feature heterogeneity (every dataset invents its own
feature schema — a pretrained model can't even run), structural heterogeneity
(homophily vs heterophily, degree distributions, motifs), and task heterogeneity
(node / edge / graph-level). The "graph vocabulary" problem: graphs have no
canonical tokens.

- Position: Graph Foundation Models Are Already Here — Mao et al.: https://arxiv.org/abs/2402.02216
- Graph Foundation Models: A Comprehensive Survey — Wang et al.: https://arxiv.org/abs/2505.15116
- Beyond Homophily in GNNs — Zhu et al.: https://arxiv.org/abs/2006.11468
- GFM survey (TPAMI 2025) — Liu et al.: https://arxiv.org/abs/2310.11829

## Module 5 — The GFM zoo: four bets on a vocabulary

Bet 1: stay in one domain — ULTRA for knowledge graphs (relation-interaction
graphs), JMP / MACE-MP-0 / UMA for atomistic systems (the periodic table as a
shared vocabulary). Bet 2: make everything text — OFA, GraphGPT, LLaGA, UniGraph.
Bet 3: structure + in-context learning — GraphAny, PRODIGY, G2T-FM, GraphPFN.
Bet 4: typed feature groups at industrial scale — the TabFM lineage
(FT-Transformer) extended to graphs, including the equivariance recipe and
GraphBFF's type-conditioned attention; the expressivity-vs-compatibility
trade-off is an open question.

- ULTRA — Galkin et al.: https://arxiv.org/abs/2310.04562
- One for All — Liu et al.: https://arxiv.org/abs/2310.00149
- GraphAny — Zhao et al.: https://arxiv.org/abs/2405.20445
- PRODIGY — Huang et al.: https://arxiv.org/abs/2305.12600
- G2T-FM — Eremeev et al.: https://arxiv.org/abs/2508.20906
- GraphPFN — Eremeev et al.: https://arxiv.org/abs/2509.21489
- JMP — Shoghi et al.: https://arxiv.org/abs/2310.16802
- Equivariance Everywhere All At Once — Finkelshtein et al.: https://arxiv.org/abs/2506.14291

## Module 6 — The billion-scale frontier

Public graph data is 3-4 orders of magnitude behind text; the biggest graphs are
private. GraphBFF (Meta, 2026): a 1.4B-parameter graph transformer pretrained
with masked link prediction on a ~50B node/edge enterprise graph — clean neural
scaling laws, and a frozen model that beats task-specific GNNs on 10/10 unseen
tasks by up to +31 PRAUC. Relational databases as the likely unlock: RelBench,
KumoRFM and KumoRFM-2, the Relational Transformer, Griffin, and Google's GFM for
relational data.

- Billion-Scale Graph Foundation Models (GraphBFF): https://arxiv.org/abs/2602.04768
- Benchmarks position paper — Bechler-Speicher et al.: https://arxiv.org/abs/2502.14546
- RelBench — Robinson et al.: https://arxiv.org/abs/2407.20060
- KumoRFM: https://kumo.ai/research/kumo_relational_foundation_model.pdf
- Google Research on relational GFMs: https://research.google/blog/graph-foundation-models-for-relational-data/
- Towards Neural Scaling Laws on Graphs — Liu et al.: https://arxiv.org/abs/2402.02054
- Do Neural Scaling Laws Exist on Graph SSL? — Ma et al.: https://arxiv.org/abs/2408.11243

## Module 7 — Open problems & going further

The vocabulary question; feature-grouping granularity; defining the pretraining
universe; evaluation when pretraining data is private; compute-optimal training
when per-example cost is graph-dependent; emergence. Reading path: Distill →
Mao et al. → Galkin & Bronstein's blog → ULTRA + GraphAny → GraphBFF → RelBench.

- Foundation Models in Graph & Geometric Deep Learning — Galkin & Bronstein: https://towardsdatascience.com/foundation-models-in-graph-geometric-deep-learning-f363e2576f58/
- Learning on Graphs conference: https://logconference.org/
- Awesome-Foundation-Models-on-Graphs: https://github.com/Zehong-Wang/Awesome-Foundation-Models-on-Graphs
