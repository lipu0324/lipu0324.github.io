---
title: "RDMA风格PDS流水线中的DMA架构位置"
date: "2026-04-02 21:07:38"
updated: "2026-04-02 21:07:38"
obsidian: true
categories:
  - "网络体系结构"
tags:
  - "RDMA"
  - "PDS"
  - "DMA"
  - "HLS"
---
# DMA Architecture Proposal for RDMA-style PDS Pipeline

## 1. 背景

当前 PDS/IPDC/TPDC 协议路径中，很多数据包并不直接承载真实 payload，
而是在包尾携带 `32 + 32` 的缓冲区索引/描述信息。

这意味着协议核心很多时候处理的是：

- 包头语义
- 连接/状态/PSN/ACK/NACK
- buffer descriptor

而不一定直接处理大段真实负载数据。

因此，如果系统最终走向 RDMA 风格，DMA 不应被看作“附属优化”，而应被看作协议数据面的正式执行单元。

---

## 2. 总体结论

### 2.1 DMA 不应放在 PDSM 内

PDSM 当前职责更适合保持为：

- 网络/会话流量分流
- 状态查询
- 关闭控制
- NACK 管理
- IPDC/TPDC 选择

如果把 DMA 放入 PDSM，会导致：

- PDSM 承担 payload 生命周期管理
- IPDC/TPDC 的协议状态与 DMA 状态耦合失控
- 管理层与执行层边界变差

**结论：PDSM 只分发 descriptor/meta，不直接执行 DMA。**

### 2.2 DMA 不应深埋在 IPDC/TPDC 的协议 FSM 核心中

协议 FSM 的核心职责应继续保持为：

- 协议状态转换
- PSN/ACK/NACK/close 判断
- 包头生成与接收合法性判定
- 重传与状态更新决策

如果把 DMA 直接塞进 FSM core：

- FSM 会膨胀为“协议 + 内存访问联合状态机”
- HLS 综合复杂度显著上升
- memory latency/backpressure 会污染协议逻辑

**结论：IPDC/TPDC 决定何时 DMA，但不直接承担 DMA 执行。**

### 2.3 推荐架构位置

DMA 应作为 **PDC 核心旁边的数据面执行单元** 存在。

推荐职责划分：

- **IPDC/TPDC**：协议判断、descriptor 生成、状态维护、可靠性控制
- **DMA engine**：内存读写执行、completion/error 返回

推荐放置位置：

- 逻辑归属上放在 `ex/` 一侧
- 接口上同时服务 `tx/` 与 `rx/`

---

## 3. 推荐模块边界

建议新增的模块形态如下：

```text
ipdc_v3/
  tx/
    ipdc_tx_dma_desc_gen_v3.hpp
    ipdc_tx_payload_fetch_join_v3.hpp
  rx/
    ipdc_rx_dma_commit_v3.hpp
  ex/
    ipdc_dma_read_engine_v3.hpp
    ipdc_dma_write_engine_v3.hpp
    ipdc_dma_completion_v3.hpp

tpdc_v3/
  tx/
    tpdc_tx_dma_desc_gen_v3.hpp
    tpdc_tx_payload_fetch_join_v3.hpp
  rx/
    tpdc_rx_dma_commit_v3.hpp
  ex/
    tpdc_dma_read_engine_v3.hpp
    tpdc_dma_write_engine_v3.hpp
    tpdc_dma_completion_v3.hpp
```

如果后续希望进一步共用，也可以抽取：

```text
include/PDS/common/
  dma_desc.hpp
  dma_engine.hpp
  dma_completion.hpp
```

但 **descriptor 的生成** 与 **commit 的触发** 仍建议保留在 IPDC/TPDC 各自的协议路径中。

---

## 4. TX 路径建议

## 4.1 TX 输入不应默认是完整 payload

TX 路径更适合接收：

- header meta
- buffer index / descriptor
- payload length
- offset
- flags（descriptor-only / inline / DMA needed）

而不是强制要求上游已经给出完整 payload stream。

## 4.2 TX 包分三类处理

### A. 控制包

例如：

- ACK
- NACK
- close
- CP

这类包：

- 不触发 DMA
- 直接走现有 TX 头部/小包路径

### B. descriptor-only 数据包

如果协议语义允许只发送：

- header
- buffer index / buffer reference

则：

- 不触发 DMA 读
- 直接拼 header + descriptor 字段

### C. 真正携带 payload 的数据包

这类包才需要 DMA read。

## 4.3 TX 中何时发起 DMA read

推荐顺序：

```text
tx_req_meta
  -> tx lookup / state decision
  -> header_gen
  -> 判断是否需要真实 payload
  -> 若需要，则发出 dma_read_desc
  -> DMA 读出 payload stream
  -> payload_fetch_join
  -> packetizer / packet_append
  -> net_out
```

### 原则

**DMA read 应发生在 header 与协议决策已经明确之后，packetize 之前。**

原因：

- 只有这时才能确认包不会被协议逻辑 drop
- 可以拿到最终 payload length / offset / flags
- 避免无效 DMA 读

## 4.4 TX 中何时拼包

不建议过早形成完整数据包。

推荐拆分为：

- `tx_header_gen`：输出 header 和 DMA/descriptor 控制信息
- `tx_payload_fetch_join`：等待 DMA payload 并与 header 合流
- `tx_packetizer` / `tx_packet_append`：形成最终网络流

即：

**payload 真正到达之前，不要完成整包拼装。**

## 4.5 TX 重传策略

推荐策略：

### 首选：重传缓存真实发送 payload

第一次发送时：

- DMA 把 payload 拉出来
- 正常发给网络
- 同时写入 retrans buffer

之后若重传：

- 直接从 retrans buffer 发
- 不重新发起 DMA

### 不推荐：只缓存 descriptor，重传时重新 DMA

原因：

- 内存内容可能变化
- 时延不可控
- 重传语义不再是“重放同一包”

**结论：可靠发送路径中，重传应优先缓存真实已发送 payload。**

---

## 5. RX 路径建议

## 5.1 RX 同样分两类包

### A. descriptor-only 包

若线上包只带：

- header
- buffer index / reference

则 RX 侧不应期待真实 payload。

这类包的处理是：

- 解析 header
- 提取 descriptor
- 生成一个 memory operation / semantic event
- 交给后续执行路径

### B. 真正携带 payload 的包

这类包的处理是：

- 解析 header
- 协议判定是否合法接收
- 生成 DMA write descriptor
- 将 payload 写入目标 buffer

## 5.2 RX 中何时发起 DMA write

推荐顺序：

```text
s_axis_net_rx
  -> rx_process_header
  -> rx_lookup / state query
  -> RX FSM 做合法性 / 乱序 / 重复判断
  -> 若该包应被接收并提交：
       emit dma_write_desc
       payload stream -> DMA write engine
  -> DMA completion
  -> state/meta update
  -> ACK / completion / SES 上报
```

### 原则

**DMA write 应发生在协议 accept decision 之后。**

即：

- 不要在 header 刚解析完就开始写内存
- 也不要拖到整个协议流程结束后才写

最合适的切点是：

> 协议层已经确认该 payload 应被接收和提交的时刻。

## 5.3 RX 中何时把数据“放进缓冲区”

答案是：

**在 RX FSM 已确认包有效、且允许 commit 之后，立即写入目标 buffer。**

这时：

- 目标 buffer 已知
- payload length 已知
- 包不会因协议判定被丢弃

## 5.4 RX 中何时认为一条消息完成

对于真正需要落内存的 payload：

- 网络接收完成 ≠ 消息完成
- DMA write 完成后，才应视为 payload 真正提交成功

因此：

**上层 semantic completion 不应早于 DMA completion。**

---

## 6. buffer index / descriptor 的归属建议

推荐归属边界：

- **IPDC/TPDC** 负责理解 descriptor 的协议语义
- **DMA engine** 只消费标准化后的 DMA descriptor

即 DMA 不理解：

- ACK/NACK
- close
- PSN
- duplicate/out-of-order

DMA 只理解：

- address / buffer id
- length
- offset
- tag
- completion / error

这样可以确保：

- 协议复杂性留在 PDC 核心
- DMA 保持为纯执行资源

---

## 7. 建议的 TX / RX 总体流水

### TX

```text
SES / PDSM / 上游
  -> tx meta / descriptor
  -> TX 事件调度
  -> state / psn / header 决策
  -> 判断是否需要 DMA read
  -> 若需要：发出 dma_read_desc
  -> DMA read payload
  -> payload_fetch_join
  -> packetizer / append
  -> net_out
  -> 同时写入 retrans cache（若为可靠发送）
```

### RX

```text
网络包输入
  -> rx_process_header
  -> lookup / state query
  -> RX FSM 判定是否合法接收
  -> 若允许提交 payload：
       emit dma_write_desc
       payload stream -> DMA write engine
  -> DMA completion
  -> state/meta update
  -> ACK/NACK / SES completion / 上报
```

---

## 8. 分阶段落地建议

建议不要一次性做“全协议 DMA 化”。

### 第一阶段：先做 RX DMA write

原因：

- RX commit 点更清晰
- 比 TX 重传耦合更小
- 更容易验证 descriptor -> buffer 落地链路

### 第二阶段：再做 TX DMA read + retrans cache

原因：

- TX 需要同时处理 header 决策、DMA latency、packetizer 等待、重传缓存
- 复杂度明显高于 RX

---

## 9. 最终推荐原则

一句话总结：

> 协议核心负责 descriptor、状态与可靠性；DMA 核心负责真实数据搬运；两者通过清晰的 desc/completion 流连接。

进一步翻译成当前仓库架构语言：

- **PDSM 不做 DMA**
- **IPDC/TPDC 决定何时 DMA**
- **DMA engine 放在 PDC 的执行/数据面旁路**
- **TX 在 header 决定后、packetize 前做 DMA read**
- **RX 在协议 accept 后、ACK/完成上报前做 DMA write**
- **retrans 优先缓存真实发送 payload，而不是只缓存 index**

---

## 10. 当前推荐实现流程：Payload Cache + Descriptor Pipeline

本节记录一个比“直接在协议路径中拖着真实 payload 走完整条链路”更适合当前仓库结构的实现方案。

核心思想是：

- **协议流** 只处理 header / meta / descriptor
- **数据流** 只处理真实 payload
- 二者通过 **片上 Payload Cache** 解耦

### 10.1 两条流分离

推荐把系统明确划分为两条并行路径：

#### A. 控制/协议流

只流动：

- header
- session meta
- PDC meta
- cache descriptor
- DMA descriptor
- completion / error

#### B. 数据流

只流动：

- 真实 payload beat

这意味着 SES / PDSManager / IPDC / TPDC 不应再直接依赖真实 payload 内容，
而应尽量只看到：

- payload length
- cache descriptor
- 必要的 sideband 信息

### 10.2 推荐新增模块

除了 DMA engine 之外，还建议引入一组片上缓存与 payload 变换模块：

```text
common/
  payload_cache_desc.hpp
  payload_cache_manager.hpp
  payload_cache_meta_table.hpp

rx/
  rx_payload_stripper.hpp
  rx_dma_commit_manager.hpp

tx/
  tx_prefetch_manager.hpp
  tx_payload_rehydrator.hpp
```

这些模块的职责与 DMA 不同：

- **Payload Cache Manager**：负责片上缓存分配、读写、释放
- **RX Payload Stripper**：把网络包中的真实 payload 剥离并写入 cache
- **TX Payload Rehydrator**：在真正发包前，把 descriptor 替换回真实 payload
- **TX Prefetch Manager**：在协议处理前把源数据 DMA 到片上 cache
- **RX DMA Commit Manager**：在 SES/协议确认后，把 cache payload DMA 到目标内存

---

## 11. RX 推荐流程

### 11.1 总体链路

```text
UDP/IP RX Parser
  -> RX Payload Stripper
  -> PDSManager
  -> IPDC / TPDC
  -> SES
  -> RX DMA Commit Manager
  -> DMA S2MM
  -> Target Memory
```

### 11.2 推荐步骤

#### Step 1: 先剥离 payload

网络包进入后，先由 `RX Payload Stripper`：

- 识别 header / payload 边界
- 把真实 payload 写入片上 cache
- 获得 `cache_desc`
- 向协议路径输出“header + descriptor + payload_len”

#### Step 2: 协议路径只看 descriptor

后续 PDSManager / IPDC / TPDC / SES：

- 不直接消费真实 payload
- 只处理协议逻辑与 cache descriptor

#### Step 3: 在语义允许提交时再 DMA write

`RX DMA Commit Manager` 在以下条件满足后再发起 DMA：

- 包已经被协议 accept
- 目标地址/目标缓冲区已经明确
- 不会因为协议判断被丢弃

此时：

- 生成 DMA write descriptor
- 从片上 cache 读出 payload stream
- 送入 DMA S2MM / DataMover

#### Step 4: DMA 完成后才算真正提交成功

对于需要落内存的真实 payload：

- 网络接收完成 ≠ 提交完成
- 协议 accept ≠ 最终落地完成

只有在 DMA completion 到达后，才应：

- 上报真正 completion
- 释放 cache slot
- 结束该 payload 生命周期

### 11.3 RX 的架构判断

如果目标地址必须等 SES 处理完才能确定，那么“SES 后再 DMA”是合理且安全的方案。

如果目标地址能够更早确定，则可以考虑在：

- 协议 accept
- 目标地址已知

这一时刻提前启动 DMA write，以降低 cache 停留时间。

---

## 12. TX 推荐流程

### 12.1 总体链路

```text
Source Memory
  -> DMA MM2S
  -> TX Prefetch Manager
  -> SES
  -> PDSManager / IPDC / TPDC
  -> TX Payload Rehydrator
  -> packetizer / append / net out
```

### 12.2 推荐步骤

#### Step 1: 在 SES 前先把真实数据 DMA 到片上 cache

`TX Prefetch Manager`：

- 根据源 descriptor 发起 DMA read
- 把真实 payload 存入片上 cache
- 生成 `cache_desc`

此后协议路径中只传：

- header meta
- payload length
- cache descriptor

#### Step 2: 协议路径只处理 descriptor

SES / PDSManager / IPDC / TPDC：

- 不需要直接拖着真实 payload
- 只处理发送语义、header、状态、descriptor

#### Step 3: 在真正发包前恢复真实 payload

`TX Payload Rehydrator` 应放在：

- `tx_header_gen` 之后
- `tx_packet_append` / `tx_packetizer` 之前

职责：

- 根据 descriptor 从片上 cache 读取 payload
- 替换掉“伪负载”或 descriptor 占位
- 形成真正的网络 payload 数据流

### 12.3 TX 的推荐落点

对于当前 v3 结构，更自然的插入位置是：

- `*_tx_header_gen_v3` 之后
- `*_tx_packet_append_v3` / `*_tx_packetizer_v3` 之前

也就是：

- Header 先定下来
- Payload 在最后一刻恢复出来

这样协议核心就能保持 descriptor 化。

---

## 13. 片上 Payload Cache 的定位

### 13.1 Payload Cache 不是 DMA

应把片上缓存看作独立正式模块，而不是 DMA 的附属部分。

建议底层直接使用：

- BRAM
- URAM
- 或 XPM memory / Block Memory Generator

不建议一开始把它做成复杂的总线化共享内存。

### 13.2 推荐 descriptor 形式

不要把 cache descriptor 仅定义为“裸地址 + 长度”，建议至少包含：

```text
cache_desc = {
  slot_id,
  start_offset,
  length,
  flags,
  owner,
  state
}
```

原因：

- 需要跟踪生命周期
- 需要支持 TX/RX 不同 owner
- 需要支持 DMA 前后状态区分
- 需要支持后续 retrans / completion / release

---

## 14. 推荐的 cache 生命周期管理

建议显式定义 slot 生命周期，而不是隐式依赖时序。

### 14.1 RX slot

建议状态：

- `FREE`
- `FILLING`
- `READY_FOR_PROTOCOL`
- `WAIT_DMA_COMMIT`
- `DMA_IN_PROGRESS`
- `DONE`
- `RELEASABLE`

### 14.2 TX slot

建议状态：

- `FREE`
- `DMA_FILLING`
- `READY_FOR_SEND`
- `IN_FLIGHT`
- `WAIT_ACK`
- `RETRANS_RETAIN`
- `RELEASABLE`

### 14.3 原则

如果没有严格 slot 生命周期管理，很容易出现：

- descriptor 指向已释放 slot
- ACK 到来前 slot 被复用
- RX DMA 未完成 slot 就被覆盖
- TX 重传时 payload 已不可用

因此，**cache manager 应被视为正式资源管理模块**。

---

## 15. 当前推荐组合

### 15.1 最小可行实现

推荐先组合如下：

- 自研 `Payload Cache Manager`
- 自研 `RX Payload Stripper`
- 自研 `TX Payload Rehydrator`
- 自研 `TX Prefetch Manager`
- 自研 `RX DMA Commit Manager`
- 使用 `AXI DataMover` 作为 DMA 执行器

### 15.2 职责边界

- **PDS/SES**：只处理 descriptor 化 payload
- **Payload Cache**：片上真实数据暂存
- **DMA/DataMover**：负责片外 memory 搬运

### 15.3 实施优先级

建议实现顺序：

1. `Payload Cache Manager`
2. `RX Payload Stripper`
3. `TX Payload Rehydrator`
4. `RX DMA Commit Manager`
5. `TX Prefetch Manager`
6. `AXI DataMover` 对接

其中前三项定义了协议流和数据流的边界，是整个设计能否长期演进的关键。
