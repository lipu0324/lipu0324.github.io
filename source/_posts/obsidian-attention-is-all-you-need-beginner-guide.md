---
title: "Attention Is All You Need：初学者阅读导读"
date: "2026-06-24 21:00:07"
updated: "2026-06-24 21:18:13"
obsidian: true
categories:
  - "论文阅读"
tags:
  - "Transformer"
  - "Attention"
  - "深度学习"
  - "论文阅读"
---

原论文：[Attention Is All You Need（arXiv:1706.03762）](https://arxiv.org/abs/1706.03762)

整理日期：2026-06-24<br>
定位：这不是全文翻译，而是一份面向初学者的论文阅读伴读。它保留页码、图表锚点和章节锚点，帮助你回到原 PDF 核对原文。

## 0. 先给结论

这篇论文的核心主张很直接：做序列到序列任务时，不一定要用 RNN 或 CNN 一步步传播信息；可以只用 attention 搭出一个 encoder-decoder 模型。这个模型就是 Transformer。

对初学者来说，最值得抓住的不是“Transformer 很强”这一句，而是三条具体理由：

1. **并行训练更容易**：RNN 必须沿时间步顺序算，Transformer 的 self-attention 可以在同一层里同时看所有位置。见 p.2 的引言与 p.6 Table 1。
2. **长距离依赖路径更短**：任意两个 token 在 self-attention 中一层就能互相影响，而 RNN 往往要跨很多步。见 p.6 Table 1 与 Section 4。
3. **效果和成本同时有优势**：论文在 WMT 2014 翻译任务上报告 Transformer big 达到 EN-DE 28.4 BLEU、EN-FR 41.8 BLEU，并给出较低训练成本对比。见 p.8 Table 2。

## 1. 读前准备

如果你是初学者，先确认这些概念有一个直觉即可，不需要一开始全部推导：

| 概念                  | 你需要知道到什么程度                          |
| ------------------- | ----------------------------------- |
| 向量、矩阵乘法             | 能看懂 `QK^T` 是把一批 query 和 key 做相似度计算。 |
| softmax             | 把一组分数变成权重，权重和为 1。                   |
| encoder-decoder     | encoder 读输入句子，decoder 逐步生成输出句子。     |
| embedding           | 把 token 变成向量。                       |
| residual connection | 把输入 `x` 加回子层输出，缓解深层训练困难。            |
| layer normalization | 对中间表示做归一化，让训练更稳定。                   |
| BLEU                | 机器翻译常用自动指标，不等同于人类理解能力。              |

## 2. 建议阅读顺序

| 顺序 | 原文位置 | 读什么 | 初学者目标 |
|---|---:|---|---|
| 1 | p.1 Abstract | 先看论文声称解决什么问题 | 记住“只用 attention，去掉 recurrence 和 convolution”。 |
| 2 | p.2 Section 1 | 看 RNN 的瓶颈 | 明白“顺序计算”为什么影响训练并行。 |
| 3 | p.3 Figure 1 + Section 3.1 | 看整体架构 | 分清 encoder、decoder、masked self-attention、encoder-decoder attention。 |
| 4 | p.4-p.5 Section 3.2 | 看 attention 公式 | 把 `Q`、`K`、`V` 和 multi-head 对上号。 |
| 5 | p.6 Section 3.5 + Section 4 | 看 positional encoding 和为什么 self-attention | 理解没有 RNN/CNN 后，位置信息必须额外加入。 |
| 6 | p.7-p.10 Sections 5-7 | 看训练、结果、消融 | 知道哪些结果支撑了论文主张，哪些只是当时实验设置。 |
| 7 | p.13-p.15 Appendix | 看 attention 可视化 | 只当辅助直觉，不要把可视化等同于严格解释。 |

## 3. 全文结构地图

| 章节 | 页码 | 这部分在回答什么问题 |
|---|---:|---|
| Abstract | p.1 | Transformer 是什么，论文声称比当时的 RNN/CNN 模型更好、更快。 |
| 1 Introduction | p.2 | 为什么 RNN 的顺序计算是瓶颈，为什么 attention 值得作为核心机制。 |
| 2 Background | p.2 | 论文和当时已有的 attention、CNN、ByteNet、ConvS2S 等工作的关系。 |
| 3 Model Architecture | p.2-p.6 | 模型怎么搭：encoder、decoder、attention、FFN、embedding、position。 |
| 4 Why Self-Attention | p.6-p.7 | 从计算复杂度、并行度、长距离依赖路径解释为什么选 self-attention。 |
| 5 Training | p.7-p.8 | 数据、硬件、优化器、学习率、正则化等实验设置。 |
| 6 Results | p.8-p.10 | 翻译结果、消融实验、句法分析迁移结果。 |
| 7 Conclusion | p.10 | 总结贡献，并提出未来扩展到图像、音频、视频等模态。 |
| Appendix | p.13-p.15 | 注意力头可视化例子。 |

## 4. 一张图读懂整体架构

![Figure 1 Transformer architecture](/uploads/obsidian/attention-fig1-transformer-architecture.png)

> 来源：Figure 1: Transformer model architecture，p.3，锚点 `F001`。

读 Figure 1 时按这个顺序看：

1. 左边是 **encoder**，右边是 **decoder**。
2. encoder 每层主要是两块：multi-head self-attention 和 feed-forward。
3. decoder 每层多一块：对 encoder 输出做 attention，也就是常说的 cross-attention。
4. decoder 的第一块是 **masked multi-head attention**，mask 的目的不是加速，而是防止当前位置偷看未来 token。
5. 每个子层外面都有 Add & Norm，对应 residual connection 加 layer normalization。

## 5. Attention 公式怎么拆

![Figure 2 attention mechanisms](/uploads/obsidian/attention-fig2-attention-mechanisms.png)

> 来源：Figure 2: Scaled dot-product and multi-head attention，p.4，锚点 `F002`。

论文的核心公式是：

```text
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

可以按四步理解：

1. `QK^T`：每个 query 和所有 key 做相似度打分。
2. `/ sqrt(d_k)`：缩放分数，避免维度大时 dot product 过大，softmax 进入梯度很小的区域。
3. `softmax(...)`：把相似度分数变成注意力权重。
4. `... V`：用这些权重对 value 做加权求和，得到当前位置的新表示。

Multi-head attention 不是把同一个 attention 重复算几次这么简单。它先把 `Q/K/V` 投影到多个子空间，每个 head 在自己的子空间里算 attention，最后 concat 再线性变换。论文的直觉是：不同 head 可以关注不同位置、不同表示子空间的信息。

## 6. 三种 attention 分别在哪里用

| 位置 | Query 来自哪里 | Key/Value 来自哪里 | 作用 |
|---|---|---|---|
| Encoder self-attention | encoder 当前层输入 | encoder 当前层输入 | 输入句子内部各 token 互相看。 |
| Decoder masked self-attention | decoder 当前层输入 | decoder 当前层输入 | 输出前缀内部互相看，但不能看未来。 |
| Encoder-decoder attention | decoder 中间表示 | encoder 输出 | 生成输出时对齐和读取输入句子信息。 |

对应原文位置：p.5 Section 3.2.3。

## 7. 为什么还需要 positional encoding

Transformer 去掉了 RNN 和 CNN，这会带来一个问题：单纯 self-attention 对 token 集合本身不天然知道顺序。论文因此把 positional encoding 加到输入 embedding 上。

论文使用正弦和余弦函数：

```text
PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
```

初学者可以先这样理解：每个位置得到一个固定的“位置向量”，它和词向量相加，让模型既知道 token 是什么，也知道 token 在哪里。论文还比较了 learned positional embedding，结果在他们的实验里几乎相同。见 p.6 Section 3.5 和 p.9 Table 3 row E。

## 8. 为什么 self-attention 有优势

![Table 1 complexity and path length](/uploads/obsidian/attention-table1-complexity-path-length.png)

> 来源：Table 1: Complexity, sequential operations, and path length，p.6，锚点 `T001`。

Table 1 是论文论证的关键，不只是装饰性表格：

| 指标 | 初学者解释 |
|---|---|
| Complexity per Layer | 一层大概要花多少计算量。 |
| Sequential Operations | 这层必须顺序执行多少步；越小越利于并行。 |
| Maximum Path Length | 两个远距离位置之间传信息要经过多长路径；越短越利于学长距离依赖。 |

论文想强调：当句子长度 `n` 小于表示维度 `d` 时，self-attention 的每层复杂度通常有竞争力；同时它的顺序操作和最大路径长度都可以是 `O(1)`。这解释了为什么 Transformer 能更好并行训练，也更容易捕获长距离依赖。

## 9. 结果该怎么看

![Table 2 translation results](/uploads/obsidian/attention-table2-translation-results.png)

> 来源：Table 2: WMT translation BLEU and training cost，p.8，锚点 `T002`。

Table 2 支撑论文的主要实证主张：

- EN-DE：Transformer big 报告 28.4 BLEU，base 报告 27.3 BLEU。
- EN-FR：Transformer big 报告 41.8 BLEU。
- 论文还把训练成本用估计 FLOPs 做了对比，强调不是单纯用更大代价换更高分。

读这张表时要注意两点：

1. 这是 2017 年左右机器翻译任务上的对比，不应直接外推为“所有任务上 Transformer 必然最好”。
2. BLEU 是自动评价指标，能说明翻译质量趋势，但不等同于语义理解能力。

![Table 3 model variations](/uploads/obsidian/attention-table3-model-variations.png)

> 来源：Table 3: Transformer architecture variations，p.9，锚点 `T003`。

Table 3 是消融实验，适合回答“模型哪些部件重要”。你可以重点看：

- head 数量太少会下降，但太多也未必更好。
- key/value 维度太小会伤害质量。
- 更大模型通常更好，但参数和训练代价也更高。
- dropout 对避免过拟合有帮助。
- sinusoidal positional encoding 和 learned positional embedding 在这里结果接近。

![Table 4 parsing results](/uploads/obsidian/attention-table4-parsing-results.png)

> 来源：Table 4: English constituency parsing results，p.10，锚点 `T004`。

Table 4 展示 Transformer 在英文 constituency parsing 上也有不错结果。它的意义是补充说明模型不只是在翻译上有效，但这部分实验规模和调参程度都比主实验更有限。

## 10. 附录可视化怎么读

![Figure 3 long-distance attention](/uploads/obsidian/attention-fig3-long-distance-attention.png)

> 来源：Figure 3: Long-distance attention example，p.13，锚点 `F003`。

![Figure 4 anaphora attention](/uploads/obsidian/attention-fig4-anaphora-attention.png)

> 来源：Figure 4: Anaphora-related attention heads，p.14，锚点 `F004`。

![Figure 5 structural attention](/uploads/obsidian/attention-fig5-structural-attention.png)

> 来源：Figure 5: Structural attention heads，p.15，锚点 `F005`。

附录图展示了一些 attention head 看起来学到了长距离依赖、指代关系和句子结构相关模式。作为初学者可以把它们当作直觉材料：attention 权重有时能提供解释线索，但不要把“某个 head 关注了某个词”直接等同于模型真的按人类语法规则推理。

## 11. 术语速查

| 英文 | 中文理解 | 在论文中的作用 |
|---|---|---|
| sequence transduction | 序列到序列转换 | 例如机器翻译：英文句子到德文句子。 |
| recurrence | 循环结构 | RNN/LSTM/GRU 的时间步递推机制，论文要去掉它。 |
| convolution | 卷积结构 | CNN/ConvS2S 使用局部窗口堆叠传播信息，论文也不依赖它。 |
| self-attention | 自注意力 | 同一序列内部 token 互相读取信息。 |
| query/key/value | 查询/键/值 | attention 的三组向量角色。 |
| multi-head attention | 多头注意力 | 多个子空间并行算 attention。 |
| feed-forward network | 前馈网络 | 每个位置独立应用的两层 MLP。 |
| mask | 掩码 | decoder 中阻止看到未来 token。 |
| positional encoding | 位置编码 | 给无循环、无卷积的模型注入顺序信息。 |
| beam search | 束搜索 | 推理时保留多个候选输出序列。 |
| label smoothing | 标签平滑 | 训练正则化，让模型不要对 one-hot 标签过度自信。 |

## 12. 常见误解

1. **误解：Transformer 完全不关心顺序。**<br>
   更准确地说，self-attention 本身不提供顺序，因此论文显式加入 positional encoding。

2. **误解：multi-head 越多越好。**<br>
   Table 3 显示在固定计算量下，head 数过多也可能下降。

3. **误解：attention 可视化就是严格解释。**<br>
   附录图只能提供行为线索，不能单独证明模型的因果机制。

4. **误解：这篇论文就是大语言模型论文。**<br>
   它提出的是 Transformer 架构，并在机器翻译和句法分析上验证。后来的 GPT/BERT/T5 等是在这个架构思想上继续发展。

5. **误解：去掉 RNN 后 decoder 就能一次性生成所有词。**<br>
   训练时可以并行处理目标序列位置，但自回归生成时仍然逐 token 生成。

## 13. 一周学习安排

| 天 | 任务 | 产出 |
|---|---|---|
| Day 1 | 读 Abstract、Introduction、Figure 1 | 用 5 句话说清 Transformer 解决什么问题。 |
| Day 2 | 读 Section 3.2 和 Figure 2 | 手写 attention 公式，并标出 Q/K/V 的形状。 |
| Day 3 | 读 Section 3.1、3.3、3.4、3.5 | 画一遍 encoder layer 和 decoder layer。 |
| Day 4 | 读 Section 4 和 Table 1 | 解释为什么 self-attention 更容易并行。 |
| Day 5 | 读 Section 5-6 和 Table 2/3 | 总结主实验和消融实验分别证明什么。 |
| Day 6 | 看附录 Figure 3-5 | 写下 attention 可视化能说明什么、不能说明什么。 |
| Day 7 | 复盘全文 | 不看笔记，重新讲一遍 Transformer 的数据流。 |

## 14. 自测题

1. 为什么 decoder self-attention 要 mask？
2. `QK^T / sqrt(d_k)` 中除以 `sqrt(d_k)` 是为了解决什么问题？
3. encoder self-attention 和 encoder-decoder attention 的 K/V 来源有什么不同？
4. 如果没有 positional encoding，模型会丢失什么信息？
5. Table 1 中 `Sequential Operations = O(1)` 对训练有什么意义？
6. Table 3 中 row E 说明了 positional encoding 的什么实验现象？
7. 为什么不能只看 BLEU 就断言模型“理解语言”？

参考答案：

1. 防止当前位置看到未来 token，保持自回归生成条件。
2. 避免 dot product 随维度变大而过大，导致 softmax 梯度过小。
3. encoder self-attention 的 Q/K/V 都来自 encoder 当前序列；encoder-decoder attention 的 Q 来自 decoder，K/V 来自 encoder 输出。
4. token 的顺序或位置信息。
5. 同一层内部不必沿序列长度逐步递推，更利于并行。
6. 在该实验设置下，learned positional embedding 和 sinusoidal positional encoding 结果几乎相同。
7. BLEU 是 n-gram 匹配类指标，不能直接衡量语义、推理或鲁棒性。

## 15. 下一步学习建议

如果你要真正读懂这篇论文，建议按这个顺序补基础：

1. 先实现一个最小 attention：输入 `Q/K/V`，输出加权和。
2. 再实现 single-head self-attention。
3. 再把 single-head 扩展到 multi-head。
4. 最后搭一个 encoder block：self-attention + feed-forward + residual + layer norm。

暂时不要一开始就追完整训练机器翻译模型。对初学者来说，先把一层 Transformer 的张量形状跑通，比追求完整复现实验更重要。
