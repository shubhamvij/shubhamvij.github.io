---
title: "Attention, Everywhere: One Mechanism from GPT to Graph Transformers"
date: "2026-07-09"
description: "Multi-head attention, vision transformers, FlashAttention/GQA/MLA, and typed graph attention (HGT, GraphBFF) are one idea in different wiring. Summary of my interactive attention course."
tags: ["transformers", "attention", "vision transformers", "graph transformers", "machine learning", "deep learning"]
---

**TL;DR:** Almost every architecture headline of the last eight years — GPT, ViT, Swin, FlashAttention, Mistral's sliding windows, DeepSeek's MLA, GAT, Graphormer, HGT, Meta's GraphBFF — is the same transformer block with two decisions changed: *what are the tokens* and *which pairs may attend to each other*. Learn the block once, read the whole field for free.

**This post is the summary.** The full interactive course — click through attention weights yourself, dissect the block, patchify an image, flip attention masks, and toggle typed graph attention — runs in the [Vijcarta '26 courseware](/learn/attention-mechanisms).

**[▸ Launch the course](/learn/attention-mechanisms)**

## Attention itself

For each token, three learned projections: a query ("what am I looking for?"), a key ("what do I offer?"), a value ("what do I hand over?"). Score every query against every key, scale by 1/√d, softmax into weights that sum to one, and blend the values. In "The animal didn't cross the street because it was too tired," the token "it" resolves its pronoun by placing most of its weight on "animal" — context, computed as a weighted average. Add a causal mask (each token sees only its past) and an encoder becomes GPT.

## The block

Multi-head attention runs several attention patterns in parallel — each head has its own Q/K/V projections and learns its own specialty (previous-token heads, coreference heads, induction heads). The block wraps attention with residual connections, LayerNorm, and a feed-forward network that holds roughly two-thirds of the parameters. The division of labor: **attention communicates, the FFN computes**, residuals keep 100-layer stacks trainable. Position must be injected (embeddings, RoPE rotations, ALiBi biases) because attention is order-blind.

## Taming the n²

Full attention scores n² pairs, and decoding drags a giant KV cache behind it. The fixes: share K/V heads across query heads (MQA, GQA), compress the cache into a latent vector (DeepSeek-V2's MLA), reorganize the computation so the n×n matrix never touches GPU main memory (FlashAttention — exact attention, just IO-aware), or simply score fewer pairs (Longformer/BigBird patterns, Mistral's sliding window).

## Vision transformers

ViT changes the data, not the model: cut the image into 16×16 patches, linearly project each to a token, add positions and a [CLS] token, feed the standard block. Without convolution's built-in locality it needs more data (DeiT fixes that with distillation); Swin brings back locality as *windowed* attention with shifted windows; MAE pretrains by masking 75% of patches. Notice: windows are attention masks — the same trick as efficient LLM attention.

## Attention is a graph

The unifying idea: an attention mask is an adjacency matrix. Full attention = message passing on the complete token graph; causal = a DAG; sliding window = a path-like graph; and restricting attention to a real graph's edges is exactly GAT. Transformers are GNNs on complete graphs; GNNs are transformers with an opinionated mask.

## Graph transformer blocks

On real graphs you can trust edges as a hard mask (GAT), inject them as soft biases over full attention (Graphormer's centrality/shortest-path/edge encodings), or hybridize local message passing with global attention (GraphGPS, sparsified by Exphormer). When nodes and edges have *types* — users/items/shops, bought/viewed/sold-by — attention goes typed: HGT parameterizes it by the meta-relation ⟨source type, edge type, target type⟩, and Meta's GraphBFF scales the idea to 1.4B parameters with a per-edge-type sparse softmax (TCA) fused with a shared type-agnostic attention (TAA), provably more expressive together. Multi-head attention discovered relationship-specific subspaces by optimization; typed attention writes them in from the schema.

**Go deeper:** the [interactive course](/learn/attention-mechanisms) makes each of these clickable, and pairs with the [Graph Foundation Models course](/learn/graph-foundation-models) for where typed graph attention is headed. Key sources: [Attention Is All You Need](https://arxiv.org/abs/1706.03762), [ViT](https://arxiv.org/abs/2010.11929), [FlashAttention](https://arxiv.org/abs/2205.14135), [GQA](https://arxiv.org/abs/2305.13245), [Transformers are GNNs](https://thegradient.pub/transformers-are-graph-neural-networks/), [Graphormer](https://arxiv.org/abs/2106.05234), [HGT](https://arxiv.org/abs/2003.01332), and [GraphBFF](https://arxiv.org/abs/2602.04768).
