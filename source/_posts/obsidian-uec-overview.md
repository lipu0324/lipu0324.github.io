---
title: "UEC白皮书阅读：总体架构与数据路径"
date: "2025-08-26 15:19:44"
updated: "2025-09-01 09:52:39"
categories:
  - "网络体系结构"
tags:
  - "UEC"
  - "AI网络"
  - "Libfabric"
---

UEC 可以理解为面向 AI/HPC 集群的新型以太网传输架构。它不是从零替代现有 IP 网络，而是在现有 L2/L3/L4 承载之上，为大规模训练、推理和高性能通信提供更合适的传输语义。

## 包结构

UEC 数据包仍然运行在现有网络体系中。一个典型包可以理解为：

```text
Ethernet / L2
  -> IPv4 或 IPv6
    -> UDP
      -> UET/UEC headers
        -> PDS / SES payload
```

这种设计有两个直接好处：

- 可以复用现有以太网交换机和 IP 网络工程经验。
- 可以通过 UDP 端口、IP 地址和 entropy 字段与现有网络转发机制协同。

## 系统角色

在 UEC 的系统视角中，节点内通常存在 Fabric Interface，也就是 FI。FI 内部可能有一个或多个 FEP。可以把 FEP 理解为 UEC fabric 中的逻辑端点，它负责承接 SES、PDS、CCC 等协议功能。

一个节点也可能有多个 port，连接到不同 fabric plane。这样可以支持：

- 多路径负载均衡。
- 链路冗余。
- 多平面网络隔离。
- 更高的总带宽。

## 数据传输路径

一次典型传输大致如下：

1. 应用通过通信库或 libfabric 发起请求。
2. SES 把高层语义转换成传输请求。
3. PDS 根据目标、PDC 状态、PSN 和传输模式生成数据包。
4. CCC 参与速率控制和路径选择。
5. NIC 或 FEP 将包封装为 IP/UDP 上的 UEC 包。
6. 交换机根据以太网/IP/UDP 头转发。
7. 目标端 FEP 接收并交给 PDS。
8. 目标 SES 处理请求并产生响应。
9. 响应通过 ACK 或新的 PDS Request 返回。

这里的关键是：PDS 负责可靠传输上下文，CCC 负责拥塞相关决策，SES 负责语义映射。

## 多平面网络

AI 集群通常需要高 bisection bandwidth 和较强的容错能力。UEC 通过多端口 FEP 和多 fabric plane 适配这类需求。

多平面网络的收益包括：

- 不同链路或交换平面之间做负载分担。
- 某个平面故障时保留可用路径。
- 结合 LAG 或 Split Multi-Link LAG 提升带宽。
- 使用不同 entropy 或 flow label 控制路径选择。

这对训练流量尤其重要，因为集体通信很容易在某些链路形成热点。

## PID on FEP

UEC 需要把应用进程、作业、FEP 上的本地标识关联起来。应用层看到的可能是 rank 或进程 ID，而 FEP 需要内部可执行的 `PIDonFEP`。

这类映射通常不适合完全放在数据面临时计算，而应由 SES 或控制面在建立 endpoint、queue 和 PDC 前完成。数据面只消费已经确认的标识和权限。

## Libfabric映射

Libfabric 提供了面向上层应用的抽象。一个可能的流程是：

1. 可信作业启动器创建作业并分配 JobID。
2. 应用通过通信库调用 libfabric。
3. UEC provider 把 libfabric 请求映射到厂商 NIC 库。
4. 内核驱动校验进程、JobID 和安全绑定。
5. 硬件写入 JobID、权限和安全表项。
6. 数据面建立后可以走用户态快速路径。

控制面仍需要内核参与校验，数据面则尽量减少内核参与以降低延迟。

## 网络负载视角

UEC 的目标场景主要是 AI/HPC 后端网络。训练负载会带来：

- 数据并行中的 All-Reduce。
- 张量并行中的高频 All-Gather/Reduce-Scatter。
- 流水线并行中的点到点激活传输。
- MoE 中动态 All-to-All。

这些流量同时要求高吞吐、低尾延迟、可恢复和可隔离。UEC 的价值也主要体现在这些场景，而不是普通互联网流量。

## 小结

UEC 的设计不是单点协议创新，而是一套面向 AI fabric 的端到端体系：应用通过 libfabric 进入 SES，SES 映射语义，PDS 管理传输上下文，CCC 管理拥塞，底层继续复用以太网和 IP/UDP 承载。理解这条路径后，后续分析 PDC、PDS Manager 和硬件实现会更清楚。
