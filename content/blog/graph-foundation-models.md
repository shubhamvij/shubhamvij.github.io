---
title: "Graph Foundation Models, in Seven Ideas"
date: "2026-07-09"
description: "Why there's no GPT for graphs yet, what the field is doing about it, and the billion-scale result that suggests the LLM playbook runs on graphs. Summary of my interactive GFM course."
tags: ["graph neural networks", "foundation models", "GNN", "machine learning", "GFM"]
---

**TL;DR:** Language and vision got foundation models; graphs mostly haven't. The blockers are a missing shared vocabulary (three kinds of heterogeneity) and a missing public data ocean. The field is running four competing bets to fix the first, and industrial relational data looks like the fix for the second — with a 2026 Meta paper showing clean LLM-style scaling laws once you have billions of edges.

**This post is the summary version.** The full interactive course — hands-on labs, quizzes, progress tracking, and 46 referenced papers — runs in the [Vijcarta '26 courseware](/learn/graph-foundation-models) on this site.

**[▸ Launch the course](/learn/graph-foundation-models)**

## 1. Half the world's data is secretly a graph

Molecules, social and payment networks, citation graphs, knowledge graphs, road networks — and every relational database, where rows are nodes and foreign keys are edges. Even text and images are special-case graphs (a path, a grid), which is why the recipe that worked for them keeps tempting graph people.

## 2. Machines learn on graphs by message passing

Each layer, every node aggregates its neighbors' feature vectors and updates its own — so k layers = a k-hop receptive field. Stack too many and everything blurs into the same vector (over-smoothing), which is why GNNs stay shallow. GCN, GraphSAGE, GAT, and GIN are one-line variations on this loop.

## 3. Foundation models follow a five-ingredient recipe

A shared token vocabulary; a self-supervised objective; a scalable architecture; predictable scaling laws; oceans of public data. At scale you get in-context learning — adaptation with zero weight updates. Keep the checklist in mind, because graphs fail it in two specific places.

## 4. Graphs break the vocabulary ingredient three ways

Feature heterogeneity: every dataset invents its own feature schema, so a pretrained model can't even run on the next graph — it fails at the first weight matrix. Structural heterogeneity: a model that learned "trust your neighbors" (homophily) transfers it to fraud graphs where neighbors are systematically opposite. Task heterogeneity: node-, edge-, and graph-level tasks want different inductive biases. Together: graphs have no canonical tokens — no "graph vocabulary."

## 5. The GFM zoo is four bets on what the vocabulary should be

Stay in one domain where vocabulary exists (ULTRA's relation-interaction graphs for KGs; JMP/MACE/UMA over the periodic table). Make everything text and borrow an LLM's vocabulary (OFA, GraphGPT, LLaGA). Bet on structure plus in-context learning (GraphAny, PRODIGY, the TabPFN-lineage G2T-FM and GraphPFN). Or group features by type with shared transformations at industrial scale — the line the GraphBFF paper builds on, at the price of an open expressivity-vs-compatibility trade-off.

## 6. The data ingredient is being unlocked at billion scale

Public graph datasets top out ~10⁹–10¹⁰ edges; the truly enormous graphs are private. "Billion-Scale Graph Foundation Models" (GraphBFF, Meta 2026) pretrains a 1.4B-parameter graph transformer on a ~50B node/edge enterprise graph with nothing but masked link prediction — and reports clean power-law scaling plus a frozen model that beats task-specific GNNs on 10/10 unseen tasks (up to +31 PRAUC). Meanwhile relational databases (RelBench, KumoRFM, Relational Transformer, Google's relational GFM) look like the field's "web-scale moment": heterogeneous graphs everywhere, with labels generated for free by the database's own timeline.

## 7. What's still open

The universal graph vocabulary; how to choose feature groupings; what "train on the web" even means for graphs; evaluation when pretraining data is private; compute-optimal budgets when per-example cost depends on neighborhood sampling; and what emerges at the next 10× of scale.

**Go deeper:** the [interactive course](/learn/graph-foundation-models) walks each idea with a lab — run message passing yourself, feed mismatched features to a pretrained model, rewire a graph from homophilic to heterophilic, and play with GraphBFF's actual fitted scaling-law exponents. Key papers if you want to jump straight to sources: [GraphBFF](https://arxiv.org/abs/2602.04768), [the GFM position paper](https://arxiv.org/abs/2402.02216), [ULTRA](https://arxiv.org/abs/2310.04562), [GraphAny](https://arxiv.org/abs/2405.20445), [RelBench](https://arxiv.org/abs/2407.20060), and the [Galkin & Bronstein overview](https://towardsdatascience.com/foundation-models-in-graph-geometric-deep-learning-f363e2576f58/).
