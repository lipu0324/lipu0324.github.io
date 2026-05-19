---
title: "InfiniBand传输层硬件数据流梳理"
date: "2025-11-19 10:04:47"
updated: "2025-11-19 16:40:54"
categories:
  - "网络体系结构"
tags:
  - "InfiniBand"
  - "RDMA"
  - "HLS"
  - "FPGA"
---

阅读 FPGA 网络栈中的 InfiniBand 传输层代码时，最重要的是先建立硬件数据流视角。顶层函数里的变量大多不是普通软件变量，而是流、表、FIFO 和模块之间的连接线。

## 对外接口

IB 传输层可以分为网络侧、用户请求侧、内存侧和管理侧。

| 方向 | 端口 | 含义 |
|---|---|---|
| RX 网络侧 | `s_axis_rx_meta` | 网络层/UDP 元信息 |
| RX 网络侧 | `s_axis_rx_data` | 收到的网络载荷，包含 BTH 和扩展头 |
| TX 网络侧 | `m_axis_tx_meta` | 即将发出的 IP/UDP 元信息 |
| TX 网络侧 | `m_axis_tx_data` | 已封装的 BTH、扩展头和载荷 |
| 用户请求 | `s_axis_sq_meta` | 用户提交的 RDMA 操作 |
| ACK 输出 | `m_axis_rx_ack_meta` | ACK/NAK 事件 |
| 存储器写 | `m_axis_mem_write_cmd` | 远端 SEND/WRITE 写本地内存命令 |
| 存储器读 | `m_axis_mem_read_cmd` | READ response 或本地发送所需读命令 |
| QP 管理 | `s_axis_qp_interface` | QP 状态配置 |
| QP 连接 | `s_axis_qp_conn_interface` | 远端连接表配置 |

这类接口说明了一个事实：传输层不是只做包头解析，它同时连接协议状态、内存 DMA、ACK 事件和 QP 管理。

## RX路径

RX 从网络收到包后，典型路径是：

```text
s_axis_rx_data
  -> rx_process_ibh
  -> rx_ibh_fsm
  -> rx_process_exh
  -> payload split / memory write / ACK event
```

关键模块职责：

- `rx_process_ibh`：解析 Base Transport Header，提取 opcode、QPn、PSN 等元信息。
- `rx_ibh_fsm`：检查 PSN、判断是否丢包、是否产生 ACK/NAK。
- `rx_process_exh`：解析扩展头，比如 RETH、AETH。
- 下游模块：根据 opcode 写内存、产生 read request 或合并 ACK 事件。

RX 路径的核心不是“收到数据就写内存”，而是先判断包是否符合 QP 状态和 PSN 预期。

## TX路径

TX 路径处理本地用户请求、远端 read response 和 ACK 事件。典型路径是：

```text
user event / ACK event / read response
  -> meta merger
  -> generate headers
  -> append payload
  -> tx data stream
```

TX 侧常见内部 FIFO 包括：

- `tx_ibhMetaFifo`：BTH 元信息。
- `tx_appMetaFifo`：本地应用 RDMA 请求元信息。
- `tx_appDataFifo`：待发送 payload。
- `tx_exhMetaFifo`：扩展头元信息。
- `tx_ibhHeaderFifo`：生成后的 BTH。
- `tx_localMemCmdFifo`：本地内存读命令。

TX 的重点是把不同来源的事件统一成协议包，同时更新发送侧 PSN 和状态表。

## 状态表与连接表

IB 传输层依赖多个状态表：

| 表 | 作用 |
|---|---|
| 连接表 | 根据 QP 查远端 IP、端口和 QP 信息 |
| RX 状态表 | 维护期望 PSN、retry 状态等 |
| TX 状态表 | 维护 next PSN 和发送状态 |
| MSN 表 | 管理 RDMA 消息序号、rkey、地址和长度 |

从硬件角度看，这些表决定了模块是否可以 II=1 流水化。表访问冲突、读写端口数量和更新时序都会影响最终性能。

## BTH与扩展头

IB 包头处理可以拆成两层：

- BTH：携带 opcode、QPn、PSN 等基本传输信息。
- 扩展头：根据 opcode 选择 RETH、AETH 等附加字段。

这种拆分对应硬件上的两个解析阶段。先解析 BTH 决定大类，再根据 opcode 决定是否继续移位、解析扩展头或直接处理 payload。

## 硬件阅读方法

阅读这类 HLS 代码时，建议按以下顺序：

1. 先看顶层函数端口。
2. 再看内部 FIFO 名称，理解模块之间的数据连接。
3. 按 RX、TX 两条主路径分别跟踪。
4. 找状态表读写点。
5. 最后再看细节状态机。

这样能避免一开始陷入局部函数细节，而忽略协议模块整体结构。

## 小结

IB 传输层硬件实现可以理解为“协议状态机 + 流水线数据通路 + 内存 DMA + 状态表”的组合。BTH/扩展头解析决定包语义，PSN/QP 状态决定合法性，TX/RX 流水线决定吞吐，状态表和 FIFO 则决定硬件是否能稳定跑满。
