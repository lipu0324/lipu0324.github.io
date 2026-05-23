---
title: "RDMA基本对象与InfiniBand、RoCE、iWARP对比"
date: "2026-05-18 22:01:23"
updated: "2026-05-20 10:56:05"
obsidian: true
categories:
  - "网络体系结构"
tags:
  - "技能学习"
  - "网络体系结构"
  - "RDMA"
  - "InfiniBand"
  - "RoCE"
  - "iWARP"
---
## 1. RDMA 基本对象

RDMA verbs 里常见对象：

| 对象      | 作用                                           |
| ------- | -------------------------------------------- |
| HCA/NIC | RDMA 网卡，负责协议处理和 DMA                          |
| PD      | Protection Domain，隔离 QP/MR 的权限域              |
| MR      | Memory Region，被注册的内存区域                       |
| lkey    | 本地访问 key，本机 WQE 访问本地 MR 时用                   |
| rkey    | 远端访问 key，远端 READ/WRITE 访问本 MR 时用             |
| CQ      | Completion Queue，完成事件队列                      |
| QP      | Queue Pair，通信端点                              |
| SQ      | Send Queue，发起 RDMA/SEND 操作                   |
| RQ      | Receive Queue，接收 SEND 消息                     |
| WQE     | Work Queue Element，应用投递给网卡的工作描述              |
| CQE     | Completion Queue Entry，网卡完成后写入 CQ 的结果        |
| SGE     | Scatter-Gather Entry，描述一段 buffer 地址、长度和 lkey |
## 2. RDMA的基本概念
RDMA顾名思义为远程DMA访问，最终都要落到DMA操作上，因此就有了各种与DMA和内存相关的操作。举个例子，read与write等。

## 3. InfiniBand，RoCE与iWARP
简单来说，InfiniBand使用专有硬件，速度最快，需要无损网络。RoCE基于UDP运行，无需无损网络，也无需专用硬件，但是其拥塞控制方式存在一些问题，iWARP使用TCP，性能最差，但是能使用TCP的流量控制等算法，兼容性较好，一般适用于小数据中心等。
### InfiniBand
InfiniBand 使用更原生的 fabric 机制：
- credit-based flow control
- congestion control
- adaptive routing
- virtual lanes
- service levels
- subnet manager 路由控制

它的问题相对可控，因为整个网络是专用设计的。
### RoCE
RoCE 通常使用：
- PFC 防丢包
- ECN 提前标记拥塞
- DCQCN 端侧降速
- QoS 隔离流量
- buffer tuning 控制队列
### iWARP
iWARP 使用 TCP 拥塞控制：
- TCP retransmission
- TCP congestion window
- TCP flow control
- TCP reliability
- 有序交付
优点是成熟稳定。
缺点是 TCP 的语义和丢包恢复可能带来更高尾延迟。

## 4. DPU相关知识
Data Process Unit，数据处理器，我们一般认为他放在智能网卡上，将本来由主机CPU处理的内容移动到网卡侧的处理器上，用于减轻服务器处理器的压力（大部分的处理器压力来自于上下文切换，进程太多反而利用率下降的厉害）
传统服务器里，很多基础设施工作都在主机 CPU 上做：
- 虚拟交换机转发
- VXLAN/Geneve overlay 封装解封装
- 安全组 / ACL / 防火墙
- TLS/IPsec 加解密
- 存储协议处理
- 虚拟机 virtio 数据面
- 容器网络转发
- 流量监控和采样
- 负载均衡
- RDMA/网络协议处理
问题是这些任务会消耗 CPU，并且和业务 workload 抢资源。
### 4.1 DPU一般卸载什么东西
**网络卸载**
- L2/L3 转发
- vSwitch / OVS
- VXLAN / Geneve overlay
- tunnel encapsulation / decapsulation
- ACL / security group
- NAT
- load balancing
- QoS / rate limiting
- flow steering
- packet filtering
- telemetry / flow sampling
- SR-IOV / vDPA / virtio-net 数据面
好处是主机CPU更少做包处理，网络延迟更稳定，虚拟化网络的吞吐更高。
**存储卸载**
- NVMe-oF
- virtio-blk / virtio-scsi
- vhost 数据面
- 分布式块存储客户端
- 存储加密
- 校验和
- 压缩/解压
- erasure coding 的部分计算
- 数据复制和镜像
好处是主机 CPU 不再大量参与云盘 IO，IO 抖动更小，也更容易做隔离。
**安全卸载**
- 防火墙
- 安全组
- micro-segmentation
- IDS/IPS 的部分数据面
- TLS 加解密
- IPsec / MACsec
- 密钥隔离
- zero-trust gateway
- DDoS 初步过滤
