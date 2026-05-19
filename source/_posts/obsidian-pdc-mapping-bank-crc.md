---
title: "PDC映射算法：Bank分组与双CRC候选"
date: "2025-08-19 14:11:49"
updated: "2025-08-21 18:55:09"
categories:
  - "网络体系结构"
tags:
  - "UEC"
  - "PDC"
  - "Hash"
  - "HLS"
---

PDC 映射算法要解决的问题是：给定一次 SES 发送请求，如何把它分配到一个合适的 PDC。算法既要尽量均匀，减少热点，也要便于硬件实现。

## 设计目标

这个算法考虑三个目标：

- 按目的 FA 分区，先把流量分散到不同 bank。
- 使用两个独立 hash 候选，降低单点冲突概率。
- 用轻量队列深度作为选择依据，避免把新请求继续压到拥塞 PDC 上。

输入可以抽象为：

```text
JobID, destinationFA, trafficclass, deliverymode
```

输出是：

```text
PDCID
```

## 算法流程

核心流程如下：

1. 根据目的 FA 计算 bank。
2. 拼接四元组形成 hash key。
3. 使用两组 CRC16 多项式或种子生成两个候选索引。
4. 读取两个候选 PDC 的队列深度。
5. 选择队列更短的候选。
6. 组合 bank 和 bank 内索引，得到全局 PDCID。
7. 做范围检查，并更新轻量队列计数。

伪代码如下：

```cpp
int mux_tx_to_pdc_id(struct ses_tx *tx) {
    uint32_t bank = hash_fa(tx->destinationFA) & BANK_MASK;

    uint64_t key =
        ((uint64_t)tx->JobID << JOBID_SHIFT) |
        ((uint64_t)tx->destinationFA << DEST_FA_SHIFT) |
        ((uint64_t)tx->trafficclass << TC_SHIFT) |
        ((uint64_t)tx->deliverymode << DM_SHIFT);

    uint16_t h1 = crc16_hash(key, CRC16_POLY1, HASH_SEED1);
    uint16_t h2 = crc16_hash(key, CRC16_POLY2, HASH_SEED2);

    uint32_t i1 = h1 & (PDCs_PER_BANK - 1);
    uint32_t i2 = h2 & (PDCs_PER_BANK - 1);

    uint8_t q1 = pdc_qdepth[bank][i1];
    uint8_t q2 = pdc_qdepth[bank][i2];

    uint32_t pick = (q1 <= q2) ? i1 : i2;

    if (pdc_qdepth[bank][pick] >= MAX_PDC_QUEUE) {
        return -1;
    }

    uint32_t pdcid = (bank << BANK_SHIFT) | pick;
    if (pdcid >= MAX_PDC) {
        return -1;
    }

    pdc_qdepth[bank][pick]++;
    return static_cast<int>(pdcid);
}
```

## 为什么使用bank

只用一个全局 hash 表会让所有请求竞争同一片资源。先按目的 FA 做 bank 分组，可以在第一步就把不同目标的流量分散开：

```text
destinationFA -> bank -> bank内PDC候选
```

这样做的优点是硬件结构清晰，bank 可以对应独立 SRAM 区域、独立队列或独立仲裁路径。

## 为什么使用双候选

双候选本质上是 power of two choices 思路：不是随机选择一个桶，而是随机选择两个候选，再选负载更低的那个。只要队列深度统计足够轻量，就能显著降低热点概率。

在硬件中，这比复杂负载均衡更容易落地：

- 两个 CRC 可以流水化。
- 两次队列深度读取可并行。
- 比较逻辑很简单。
- 不需要全表扫描。

## CRC的硬件可实现性

CRC16 适合作为硬件 hash 的原因是组合逻辑明确，资源可控，延迟可以通过流水线处理。相比软件里常见的复杂 hash，CRC 在 HLS/RTL 中更容易估算时序和面积。

需要注意的是，CRC 多项式和 seed 应该尽量独立，否则两个候选并不真正独立，冲突改善会变弱。

## 边界检查

这个算法至少需要两个检查：

- `pdc_qdepth[bank][pick] >= MAX_PDC_QUEUE`
- `pdcid >= MAX_PDC`

第一项防止局部队列继续溢出，第二项防止参数配置或位拼接错误导致非法 PDCID。实际实现中还需要考虑计数器何时递减，也就是 PDC 完成处理后的 completion 路径。

## 小结

Bank 分组解决粗粒度分流，双 CRC 候选解决细粒度冲突，队列深度比较解决短期热点。这个方案的优点不是理论上最优，而是足够简单，适合硬件路径实现，并且在高并发场景下比单 hash 映射更稳。
