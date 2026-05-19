---
title: "Hard-UE中UDP与IPv6顶层接口说明"
date: "2026-03-27 10:40:18"
updated: "2026-03-27 10:40:34"
obsidian: true
categories:
  - "FPGA"
tags:
  - "Hard-UE"
  - "IPv6"
  - "UDP"
  - "HLS"
---
# UDP 与 IPv6 顶层接口说明

## 1. 文档目标

本文仅聚焦两个顶层函数接口：

- `ipv6_top(...)`（`Hard_UE/src/network/ipv6/ipv6.cpp`）
- `udp_top(...)`（`Hard_UE/src/network/udp/udp.cpp`）

内部函数（`ipv6()` / `udp()` / `process_*`）仅在附录简述，不作为主对接接口。

## 2. 公共数据类型

### 2.1 `net_axis<D>`

| 字段 | 位宽 | 含义 |
|---|---:|---|
| `data` | `D` | AXIS 数据 |
| `keep` | `D/8` | 字节有效位 |
| `last` | `1` | 包尾标记 |

### 2.2 默认位宽

| 参数 | 值 |
|---|---:|
| `DATA_WIDTH` | `64` bit |

### 2.3 元信息结构

`ipv6Meta`：

| 字段 | 位宽 | 语义 |
|---|---:|---|
| `their_address` | 128 | 对端地址（RX=源地址，TX=目的地址） |
| `length` | 16 | IPv6 payload 长度 |
| `next_header` | 8 | IPv6 上层协议号 |

`ipUdpMeta`：

| 字段 | 位宽 | 语义 |
|---|---:|---|
| `their_address` | 128 | 对端 IPv6 地址 |
| `their_port` | 16 | 对端 UDP 端口 |
| `my_port` | 16 | 本端 UDP 端口 |
| `length` | 16 | RX 输出为 UDP 长度字段；TX 输入按 payload 长度使用（内部会 `+8`） |

## 3. `ipv6_top` 接口

源码位置：`Hard_UE/src/network/ipv6/ipv6.cpp`

函数原型：

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

端口说明：

| 端口 | 方向 | 类型 | 功能 |
|---|---|---|---|
| `s_axis_rx_data` | In | `stream<net_axis<64>>` | 输入 IPv6 报文流（含 IPv6 头） |
| `m_axis_rx_meta` | Out | `stream<ipv6Meta>` | 输出 IPv6 解析元信息 |
| `m_axis_rx_data` | Out | `stream<net_axis<64>>` | 输出去 IPv6 头后的上层数据流 |
| `s_axis_tx_meta` | In | `stream<ipv6Meta>` | 输入待封装 IPv6 的元信息 |
| `s_axis_tx_data` | In | `stream<net_axis<64>>` | 输入待封装 payload |
| `m_axis_tx_data` | Out | `stream<net_axis<64>>` | 输出 IPv6 头 + payload |
| `reg_ip_address` | In | `ap_uint<128>` | 本端 IPv6 地址（TX 源地址） |

顶层 pragma（接口相关）：

- `#pragma HLS INTERFACE ap_ctrl_none port=return`
- `#pragma HLS INTERFACE ap_none register port=reg_ip_address`
- `m_axis_rx_meta/s_axis_tx_meta` 使用 `aggregate`（或 `DATA_PACK`）

## 4. `udp_top` 接口

源码位置：`Hard_UE/src/network/udp/udp.cpp`

`udp_top` 有两套函数签名（由 `__VITIS_HLS__` 控制）。

### 4.1 Vitis HLS 分支

```cpp
void udp_top(
  hls::stream<ipMeta>&                     s_axis_rx_meta,
  hls::stream<ap_axiu<DATA_WIDTH,0,0,0>>& s_axis_rx_data,
  hls::stream<ipUdpMeta>&                  m_axis_rx_meta,
  hls::stream<ap_axiu<DATA_WIDTH,0,0,0>>& m_axis_rx_data,
  hls::stream<ipUdpMeta>&                  s_axis_tx_meta,
  hls::stream<ap_axiu<DATA_WIDTH,0,0,0>>& s_axis_tx_data,
  hls::stream<ipMeta>&                     m_axis_tx_meta,
  hls::stream<ap_axiu<DATA_WIDTH,0,0,0>>& m_axis_tx_data,
  ap_uint<128>                             reg_ip_address,
  ap_uint<16>                              reg_listen_port
);
```

说明：`ipMeta` 在当前配置下等价于 `ipv6Meta`（`IP_VERSION=6`）。

### 4.2 非 Vitis 分支

与上面一致，但 4 个数据流端口类型由 `ap_axiu` 改为 `net_axis<DATA_WIDTH>`。

端口说明（两分支语义一致）：

| 端口 | 方向 | 类型 | 功能 |
|---|---|---|---|
| `s_axis_rx_meta` | In | `stream<ipMeta>` | 输入 IP 层元信息（当前是 `ipv6Meta`） |
| `s_axis_rx_data` | In | `stream<ap_axiu...>` / `stream<net_axis<64>>` | 输入 UDP 报文流（含 UDP 头） |
| `m_axis_rx_meta` | Out | `stream<ipUdpMeta>` | 输出 UDP 解析元信息（仅端口命中输出） |
| `m_axis_rx_data` | Out | `stream<ap_axiu...>` / `stream<net_axis<64>>` | 输出 UDP payload |
| `s_axis_tx_meta` | In | `stream<ipUdpMeta>` | 输入应用发包元信息 |
| `s_axis_tx_data` | In | `stream<ap_axiu...>` / `stream<net_axis<64>>` | 输入应用 payload |
| `m_axis_tx_meta` | Out | `stream<ipMeta>` | 输出给 IPv6 的发包元信息 |
| `m_axis_tx_data` | Out | `stream<ap_axiu...>` / `stream<net_axis<64>>` | 输出 UDP 头 + payload |
| `reg_ip_address` | In | `ap_uint<128>` | 预留输入（当前 `udp()` 内未使用） |
| `reg_listen_port` | In | `ap_uint<16>` | UDP RX 监听端口过滤 |

顶层 pragma（接口相关）：

- `#pragma HLS INTERFACE ap_ctrl_none port=return`
- 8 个流端口均：`#pragma HLS INTERFACE axis register`
- Vitis 分支：`reg_ip_address/reg_listen_port` 为 `ap_none`
- 非 Vitis 分支：`reg_ip_address/reg_listen_port` 为 `ap_stable`

## 5. 两个顶层函数的标准连接

| 路径 | 发送端 | 接收端 | 类型 |
|---|---|---|---|
| RX meta | `ipv6_top.m_axis_rx_meta` | `udp_top.s_axis_rx_meta` | `ipv6Meta(ipMeta)` |
| RX data | `ipv6_top.m_axis_rx_data` | `udp_top.s_axis_rx_data` | `net_axis<64>` 或 `ap_axiu<64,...>` |
| TX meta | `udp_top.m_axis_tx_meta` | `ipv6_top.s_axis_tx_meta` | `ipv6Meta(ipMeta)` |
| TX data | `udp_top.m_axis_tx_data` | `ipv6_top.s_axis_tx_data` | `net_axis<64>` 或 `ap_axiu<64,...>` |

寄存器连接：

| 信号 | 连接建议 |
|---|---|
| `reg_ip_address` | 同时接 `ipv6_top` 和 `udp_top`（虽然 UDP 当前未使用） |
| `reg_listen_port` | 仅接 `udp_top` |

## 6. 对接时必须确认的 4 点

1. 两个顶层的数据流类型必须匹配（`net_axis` 或 `ap_axiu` 统一）。  
2. `ipUdpMeta.length` 在 TX 入口按 payload 长度填写。  
3. `reg_listen_port` 必须配置正确，否则 UDP RX 无输出。  
4. 包边界依赖 `last`，上游必须保证每包仅末拍 `last=1`。  

## 7. 附录：内部函数（简述）

- `ipv6_top` 内部调用 `ipv6()`，执行 IPv6 头解析/封装与数据对齐。
- `udp_top` 内部调用 `udp()`，执行 UDP 头解析/封装、端口过滤、meta 合并拆分。
- 这部分不作为模块间对接接口，仅用于调试实现细节。
