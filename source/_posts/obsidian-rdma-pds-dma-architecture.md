---
title: "RDMA风格PDS流水线中的DMA架构位置"
date: "2026-04-02 21:07:38"
updated: "2026-04-02 21:07:38"
categories:
  - "网络体系结构"
tags:
  - "RDMA"
  - "PDS"
  - "DMA"
  - "HLS"
---

当 PDS/IPDC/TPDC 逐渐走向 RDMA 风格后，DMA 不应再被看作附属优化，而应被看作协议数据面的正式执行单元。很多数据包并不直接携带完整 payload，而是在包尾携带 buffer descriptor 或索引，这意味着协议核心处理的是元信息、状态和 descriptor，真正的数据搬运应交给独立 DMA 路径。

## DMA不应放在PDSM内

PDSM 更适合保持为管理层：

- 网络和会话流量分流。
- 状态查询。
- PDC 关闭控制。
- NACK 管理。
- IPDC/TPDC 选择。

如果把 DMA 放入 PDSM，会让管理层承担 payload 生命周期管理，导致协议状态和内存访问状态耦合。PDSM 应该分发 descriptor 和 meta，而不是直接执行 DMA。

## DMA也不应深埋在协议FSM里

IPDC/TPDC 的协议 FSM 核心职责是：

- 协议状态转换。
- PSN、ACK、NACK、close 判断。
- 包头生成和合法性判定。
- 重传与状态更新决策。

如果把 DMA 执行塞进 FSM core，FSM 会膨胀成“协议 + 内存访问”的联合状态机。memory latency 和 backpressure 会污染协议逻辑，也会提高 HLS 综合复杂度。

更合理的边界是：IPDC/TPDC 决定何时 DMA，DMA engine 负责执行。

## 推荐架构

推荐把 DMA 放在 PDC 核心旁边，作为数据面执行单元：

```text
IPDC/TPDC
  -> protocol decision
  -> dma descriptor
  -> DMA engine
  -> completion / error
  -> protocol state update
```

职责划分如下：

| 模块 | 职责 |
|---|---|
| IPDC/TPDC | 协议判断、descriptor 生成、状态维护、可靠性控制 |
| DMA read engine | 根据 descriptor 读取 payload |
| DMA write engine | 根据 descriptor 写入本地内存 |
| DMA completion | 返回完成、错误和 backpressure 信息 |
| PDSM | 分发请求、管理 PDC、处理资源和关闭 |

## TX路径

TX 输入不应默认是完整 payload，而应允许以下字段：

- header meta
- buffer index 或 descriptor
- payload length
- offset
- flags：descriptor-only、inline、DMA needed

TX 包可以分为三类：

1. 控制包：ACK、NACK、close、CP，不触发 DMA。
2. descriptor-only 数据包：只发送 header 和 buffer reference。
3. payload 数据包：需要 DMA read 读出真实数据。

推荐顺序：

```text
tx_req_meta
  -> tx lookup / state decision
  -> header_gen
  -> 判断是否需要真实 payload
  -> dma_read_desc
  -> DMA payload stream
  -> payload_fetch_join
  -> packetizer
  -> net_out
```

DMA read 应发生在协议决策之后、packetize 之前。

## RX路径

RX 侧也不应让协议 FSM 直接写内存。更合理的流程是：

```text
rx packet parse
  -> protocol validation
  -> extract descriptor / payload info
  -> dma_write_desc
  -> DMA write engine
  -> completion
  -> ACK / NACK decision
```

这样可以把接收合法性、内存写入和完成反馈拆开。协议路径只关心“是否允许写、写哪里、写多长”，真正的 AXI 写事务交给 DMA engine。

## Completion路径

DMA completion 至少需要表达：

- descriptor id
- success 或 error
- 写入/读取长度
- backpressure 或 retry 信息

协议状态更新不应该假设 DMA 一定成功。DMA 失败可能需要 NACK、重试、关闭 PDC 或上报错误。

## 为什么这种边界更适合HLS

HLS 设计中，复杂状态机和不确定内存延迟混在一起会很难优化。拆出 DMA engine 后：

- 协议 FSM 更短、更容易验证。
- DMA engine 可以单独流水化和调参。
- backpressure 边界更清晰。
- TX/RX 可以共用一部分 descriptor 和 completion 类型。

## 小结

PDSM 做管理，IPDC/TPDC 做协议，DMA engine 做数据搬运。这个边界能避免协议状态机失控，也更符合 RDMA 风格数据面的长期演进方向。
