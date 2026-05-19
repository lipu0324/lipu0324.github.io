---
title: "Hard-UE中UDP与IPv6顶层接口说明"
date: "2026-03-27 10:40:18"
updated: "2026-03-27 10:40:34"
categories:
  - "FPGA"
tags:
  - "Hard-UE"
  - "IPv6"
  - "UDP"
  - "HLS"
---

这篇笔记整理 Hard-UE 中 `ipv6_top` 和 `udp_top` 两个顶层函数的对接方式。重点不是内部实现细节，而是模块间接口、数据类型和连接约束。

## 公共数据类型

数据流使用 AXIS 风格结构：

```cpp
template<int D>
struct net_axis {
    ap_uint<D> data;
    ap_uint<D / 8> keep;
    ap_uint<1> last;
};
```

默认数据位宽：

| 参数 | 值 |
|---|---:|
| `DATA_WIDTH` | 64 bit |

IPv6 元信息：

| 字段 | 位宽 | 语义 |
|---|---:|---|
| `their_address` | 128 | 对端地址，RX 为源地址，TX 为目的地址 |
| `length` | 16 | IPv6 payload 长度 |
| `next_header` | 8 | IPv6 上层协议号 |

UDP 元信息：

| 字段 | 位宽 | 语义 |
|---|---:|---|
| `their_address` | 128 | 对端 IPv6 地址 |
| `their_port` | 16 | 对端 UDP 端口 |
| `my_port` | 16 | 本端 UDP 端口 |
| `length` | 16 | RX 为 UDP 长度字段，TX 按 payload 长度填写 |

## ipv6_top接口

`ipv6_top` 的职责是解析和封装 IPv6 头。

```cpp
void ipv6_top(
  hls::stream<net_axis<DATA_WIDTH>>& s_axis_rx_data,
  hls::stream<ipv6Meta>&             m_axis_rx_meta,
  hls::stream<net_axis<DATA_WIDTH>>& m_axis_rx_data,
  hls::stream<ipv6Meta>&             s_axis_tx_meta,
  hls::stream<net_axis<DATA_WIDTH>>& s_axis_tx_data,
  hls::stream<net_axis<DATA_WIDTH>>& m_axis_tx_data,
  ap_uint<128>                       reg_ip_address
);
```

端口可以分成两组：

- RX：输入完整 IPv6 报文，输出去掉 IPv6 头后的 payload 和 meta。
- TX：输入 payload 和 meta，输出 IPv6 头加 payload。

`reg_ip_address` 是本端 IPv6 地址，在 TX 时作为源地址使用。

## udp_top接口

`udp_top` 负责 UDP 头解析、封装和监听端口过滤。Vitis HLS 分支中数据流可能使用 `ap_axiu<DATA_WIDTH,0,0,0>`，非 Vitis 分支中使用 `net_axis<DATA_WIDTH>`，但语义一致。

核心端口如下：

| 端口 | 方向 | 功能 |
|---|---|---|
| `s_axis_rx_meta` | In | 来自 IP 层的元信息 |
| `s_axis_rx_data` | In | 含 UDP 头的数据流 |
| `m_axis_rx_meta` | Out | UDP 解析后的元信息 |
| `m_axis_rx_data` | Out | UDP payload |
| `s_axis_tx_meta` | In | 应用侧发包元信息 |
| `s_axis_tx_data` | In | 应用侧 payload |
| `m_axis_tx_meta` | Out | 送给 IPv6 层的元信息 |
| `m_axis_tx_data` | Out | UDP 头加 payload |
| `reg_listen_port` | In | RX 监听端口过滤 |

## 标准连接方式

两个模块的标准连接是：

| 路径 | 发送端 | 接收端 |
|---|---|---|
| RX meta | `ipv6_top.m_axis_rx_meta` | `udp_top.s_axis_rx_meta` |
| RX data | `ipv6_top.m_axis_rx_data` | `udp_top.s_axis_rx_data` |
| TX meta | `udp_top.m_axis_tx_meta` | `ipv6_top.s_axis_tx_meta` |
| TX data | `udp_top.m_axis_tx_data` | `ipv6_top.s_axis_tx_data` |

寄存器连接：

- `reg_ip_address` 同时连接到 IPv6 和 UDP 顶层，尽管 UDP 当前可能未使用。
- `reg_listen_port` 只连接到 UDP。

## 对接时必须检查

1. IPv6 和 UDP 顶层的数据流类型必须一致。
2. `ipUdpMeta.length` 在 TX 入口按 payload 长度填写，内部再处理 UDP 头长度。
3. `reg_listen_port` 配置不正确时，UDP RX 不会输出数据。
4. 包边界依赖 `last`，每个包只能在最后一个 beat 置 `last=1`。

## 小结

`ipv6_top` 和 `udp_top` 的连接关系本身并不复杂，真正容易出错的是数据流类型、长度语义和 `last` 边界。只要这三点统一，后续 PDS/UEC 层就可以把 UDP/IPv6 看成稳定的下层承载。
