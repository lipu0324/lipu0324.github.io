---
title: "RDMA基本对象与InfiniBand、RoCE、iWARP对比"
date: "2026-05-18 22:01:23"
updated: "2026-05-19 20:53:23"
categories:
  - "网络体系结构"
tags:
  - "RDMA"
  - "InfiniBand"
  - "RoCE"
  - "iWARP"
---

RDMA 的核心思想是让一台机器能够直接访问另一台机器注册过的内存区域，把数据搬运尽量下沉到网卡和 DMA 路径中。理解 RDMA verbs 中的基本对象，是继续阅读 InfiniBand、RoCE 或硬件网络栈的前提。

## 常见对象

| 对象 | 作用 |
|---|---|
| HCA/NIC | RDMA 网卡，负责协议处理和 DMA |
| PD | Protection Domain，隔离 QP 和 MR 的权限域 |
| MR | Memory Region，被注册的内存区域 |
| lkey | 本地访问 key，本机 WQE 访问本地 MR 时使用 |
| rkey | 远端访问 key，远端 READ/WRITE 访问本 MR 时使用 |
| CQ | Completion Queue，完成事件队列 |
| QP | Queue Pair，通信端点 |
| SQ | Send Queue，发起 RDMA/SEND 操作 |
| RQ | Receive Queue，接收 SEND 消息 |
| WQE | Work Queue Element，应用投递给网卡的工作描述 |
| CQE | Completion Queue Entry，网卡完成后写入 CQ 的结果 |
| SGE | Scatter-Gather Entry，描述 buffer 地址、长度和 lkey |

这些对象共同构成了应用和网卡之间的工作队列模型。

## 基本路径

一次 RDMA 操作可以简化为：

1. 应用注册内存，得到 MR、lkey 和 rkey。
2. 应用创建 QP、CQ，并把 QP 连接到远端。
3. 应用向 SQ 投递 WQE。
4. 网卡读取 WQE 和 SGE，执行 DMA。
5. 操作完成后，网卡向 CQ 写入 CQE。
6. 应用轮询或等待 CQ，得知操作完成。

这种模型减少了内核参与，也减少了不必要的数据拷贝。

## InfiniBand

InfiniBand 是更专用的 fabric。它通常依赖专门硬件和完整的 IB 网络体系，能够提供较强的性能和可控性。

常见机制包括：

- credit-based flow control
- congestion control
- adaptive routing
- virtual lanes
- service levels
- subnet manager 路由控制

它的优势是体系内机制完整，问题相对可控；代价是硬件和网络部署更专用。

## RoCE

RoCE 把 RDMA 语义放到以太网上运行。RoCEv2 通常基于 UDP/IP，因此更容易进入现有数据中心网络。

RoCE 常见配套机制包括：

- PFC 防丢包。
- ECN 提前标记拥塞。
- DCQCN 在端侧降速。
- QoS 隔离不同流量。
- buffer tuning 控制队列积压。

RoCE 的关键问题在于以太网环境下如何控制拥塞、丢包和尾延迟。它不只是“把 RDMA 放到 UDP 上”，还需要一整套网络配置配合。

## iWARP

iWARP 基于 TCP。它利用 TCP 的可靠传输、拥塞控制、流量控制和有序交付，因此兼容性较好。

优点：

- 可以运行在普通 TCP/IP 网络上。
- 拥塞控制和重传机制成熟。
- 部署门槛相对低。

缺点：

- TCP 语义带来额外开销。
- 丢包恢复和有序交付可能增加尾延迟。
- 性能通常不如专用 IB 或优化充分的 RoCE。

## 对比

| 协议 | 承载 | 优点 | 主要挑战 |
|---|---|---|---|
| InfiniBand | 专用 fabric | 性能强，机制完整 | 部署专用，生态独立 |
| RoCE | 以太网 / UDP/IP | 兼容数据中心以太网，高性能 | 拥塞控制和无损配置复杂 |
| iWARP | TCP/IP | 兼容性好，可靠性成熟 | 延迟和性能受 TCP 语义影响 |

## 小结

RDMA 的本质是把通信语义、内存注册和 DMA 执行结合起来。InfiniBand、RoCE 和 iWARP 的差异主要在承载网络和拥塞/可靠性机制上。继续研究 UEC、PDS 或硬件网络栈时，RDMA 对象模型和队列模型是非常重要的参照系。
