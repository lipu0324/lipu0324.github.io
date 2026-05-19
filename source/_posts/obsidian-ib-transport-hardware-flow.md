---
title: "InfiniBand传输层硬件数据流梳理"
date: "2025-11-19 10:04:47"
updated: "2025-11-19 16:40:54"
obsidian: true
categories:
  - "网络体系结构"
tags:
  - 论文阅读
  - 网络体系结构
  - 学术与知识
---

# 概述
IB传输层是fpga-network-stack的一个部分，通过学习这个部分对于下一步针对UEC的开发有着很重要的作用。在之前的学习中，我们已经确定了一个学习方向，从上往下构建整个模块的架构，首先需要注意的是，我们需要使用硬件的思维去思考所有的代码。
在顶层函数中的变量基本都是接口和内部连接用的连接线，注意到这种情况以后，学习的路径会变得清晰。
## 对外IO
| 方向             | 端口名                        | 数据类型              | 含义                                                 |
| -------------- | -------------------------- | ----------------- | -------------------------------------------------- |
| **RX 网络侧**     |                            |                   |                                                    |
| in             | `s_axis_rx_meta`           | `ipUdpMeta`       | 网络层/传输层元信息：远端 IP、UDP 端口、包长度                        |
| in             | `s_axis_rx_data`           | `net_axis<WIDTH>` | 真正的 **以太网帧载荷**（含 BTH + 扩展头 + 载荷）                   |
| **TX 网络侧**     |                            |                   |                                                    |
| out            | `m_axis_tx_meta`           | `ipUdpMeta`       | 即将发出的包的 **IP/UDP 头信息**（目的 IP、端口、长度）                |
| out            | `m_axis_tx_data`           | `net_axis<WIDTH>` | 已封装好的 **完整以太网帧载荷**（BTH + 扩展头 + 载荷）                 |
| **用户 RDMA 请求** |                            |                   |                                                    |
| in             | `s_axis_sq_meta`           | `txMeta`          | 用户提交的 **本地 RDMA 操作**（opcode、vaddr、len、raddr）       |
| **ACK 事件给上层**  |                            |                   |                                                    |
| out            | `m_axis_rx_ack_meta`       | `ackMeta`         | 向上层报告 **ACK/NAK 事件**（QPn、PSN、是否 NAK）               |
| **存储器写**       |                            |                   |                                                    |
| out            | `m_axis_mem_write_cmd`     | `memCmd`          | 把远端 **SEND/WRITE 数据** 写进本地存储器的命令                   |
| out            | `m_axis_mem_write_data`    | `net_axis<WIDTH>` | 真正的 **写数据载荷**                                      |
| **存储器读**       |                            |                   |                                                    |
| out            | `m_axis_mem_read_cmd`      | `memCmd`          | 为 **READ Response** 或 **本地 SEND/WRITE** 读取本地存储器的命令 |
| in             | `s_axis_mem_read_data`     | `net_axis<WIDTH>` | 存储器返回的 **读数据**                                     |
| **QP 管理**      |                            |                   |                                                    |
| in             | `s_axis_qp_interface`      | `qpContext`       | 配置/修改 **QP 状态**（QPn、rkey、PSN、状态机）                  |
| in             | `s_axis_qp_conn_interface` | `ifConnReq`       | 建立/拆除 **连接表条目**（远端 IP、端口、QPn）                      |
| **调试 & 统计**    |                            |                   |                                                    |
| out            | `regInvalidPsnDropCount`   | `ap_uint<32>`     | **因 PSN 乱序/无效而丢弃的包计数**                             |
| out            | `regRetransCount`          | `ap_uint<32>`     | **重传次数**                                           |
| out            | `regIbvCountRx`            | `ap_uint<32>`     | **接收包计数**                                          |
| out            | `regIbvCountTx`            | `ap_uint<32>`     | **发送包计数**                                          |
| out            | `m_axis_dbg`               | `psnPkg`          | 调试流：打印 **PSN、opcode、状态机信息**（仅在 `DBG_IBV` 打开时存在）    |
## 内部路径
| 内部 FIFO 名称                 | 数据类型                         | 含义                                                        |
| -------------------------- | ---------------------------- | --------------------------------------------------------- |
| **RX 路径**                  |                              |                                                           |
| `rx_ibh2shiftFifo`         | `net_axis<WIDTH>`            | 刚从网络收进来的 **完整以太网帧**（含 BTH），下一步要按字节移位去掉 BTH                |
| `rx_shift2exhFifo`         | `net_axis<WIDTH>`            | 去掉 **BTH** 后的裸载荷，准备交给 `rx_process_exh` 解析扩展头              |
| `rx_exh2dropFifo`          | `net_axis<WIDTH>`            | 经过 EXH 解析后、尚未决定是否丢弃的 **载荷**                               |
| `rx_ibhDrop2exhFifo`       | `net_axis<WIDTH>`            | 被判定 **不丢弃** 的载荷，继续流向后续模块                                  |
| `rx_ibh2fsm_MetaFifo`      | `ibhMeta`                    | 从 BTH 提取出的 **元数据**（opcode、QPn、PSN 等），给 `rx_ibh_fsm` 做顺序检查 |
| `rx_fsm2exh_MetaFifo`      | `ibhMeta`                    | 通过 PSN 检查后、**有效的** BTH 元数据，继续给 `rx_exh_fsm`               |
| `rx_exh2rethShiftFifo`     | `net_axis<WIDTH>`            | 含 **RETH** 的载荷，需要再做一次字节移位对齐                               |
| `rx_exh2aethShiftFifo`     | `net_axis<WIDTH>`            | 含 **AETH** 的载荷，需要再做一次字节移位对齐                               |
| `rx_exhNoShiftFifo`        | `net_axis<WIDTH>`            | **无扩展头** 的纯载荷，直接往后传                                       |
| `rx_rethSift2mergerFifo`   | `net_axis<WIDTH>`            | 移位后的 **RETH 载荷**，准备进合并器                                   |
| `rx_aethSift2mergerFifo`   | `net_axis<WIDTH>`            | 移位后的 **AETH 载荷**，准备进合并器                                   |
| `rx_pkgSplitTypeFifo`      | `pkgSplit`                   | 告诉下游“这一包是什么 **opcode**”                                   |
| `rx_pkgShiftTypeFifo`      | `pkgShift`                   | 告诉合并器“该用哪种 **移位方式**（NONE / RETH / AETH）”                  |
| `rx_ibhEventFifo`          | `ackEvent`                   | `rx_ibh_fsm` 产生的 **ACK/NAK 事件**（QPn + PSN）                |
| `rx_exhEventMetaFifo`      | `ackEvent`                   | `rx_exh_fsm` 产生的 **ACK 事件**（针对 SEND/WRITE）                |
| `rx_remoteMemCmd`          | `memCmdInternal`             | 远端 **READ 请求** 拆成的内部存储器读命令                                |
| `rx_readRequestFifo`       | `readRequest`                | 远端 READ 请求的 **原始信息**（vaddr、len、PSN）                       |
| `rx_readEvenFifo`          | `event`                      | 读数据准备好后，送给 TX 侧生成 READ Response 的 **事件**                  |
| `rx_ackEventFifo`          | `ackEvent`                   | 把 RX 侧所有 ACK 事件 **合并后** 送给 TX 侧                           |
| **TX 路径**                  |                              |                                                           |
| `tx_ibhMetaFifo`           | `ibhMeta`                    | 经 `meta_merger` 后的 **BTH 元数据**（opcode、QPn、PSN）            |
| `tx_appMetaFifo`           | `event`                      | 本地用户 RDMA 请求的 **元数据**（opcode、vaddr、len）                   |
| `tx_appDataFifo`           | `net_axis<WIDTH>`            | 本地待发送的 **payload**（从存储器读回的数据）                             |
| `tx_exhMetaFifo`           | `event`                      | 经 `meta_merger` 后的 **扩展头元数据**                             |
| `tx_exh2shiftFifo`         | `net_axis<WIDTH>`            | 已拼好扩展头+载荷，但 **尚未加 BTH** 的包                                |
| `tx_shift2ibhFifo`         | `net_axis<WIDTH>`            | 左移对齐后，准备 **加 BTH** 的包                                     |
| `tx_aethShift2payFifo`     | `net_axis<WIDTH>`            | 左移 **AETH** 后的载荷                                          |
| `tx_rethShift2payFifo`     | `net_axis<WIDTH>`            | 左移 **RETH** 后的载荷                                          |
| `tx_rawPayFifo`            | `net_axis<WIDTH>`            | **无需扩展头** 的裸载荷                                            |
| `tx_exh2payFifo`           | `net_axis<WIDTH>`            | 扩展头已生成，等待 **与载荷拼接**                                       |
| `tx_ibhHeaderFifo`         | `BaseTransportHeader<WIDTH>` | 已生成的 **BTH**，准备 prepend                                   |
| `tx_localMemCmdFifo`       | `memCmdInternal`             | 本地 RDMA 请求所需的 **存储器读命令**                                  |
| `tx_packetInfoFifo`        | `txPacketInfo>`              | 告诉 `append_payload` 本包 **是否需要扩展头 / AETH**                 |
| `tx_lengthFifo`            | `ap_uint<16>`                | 本包 **UDP 长度**，送给 `tx_ipUdpMetaMerger`                     |
| `tx_dstQpFifo`             | `ap_uint<24>`                | 从连接表查到的 **远端 QP 号**，送给 `generate_ibh`                     |
| **公用表/调试**                 |                              |                                                           |
| `tx_ibhconnTable_req`      | `ap_uint<16>`                | 向 **连接表** 查询远端 IP/端口/QP 的 key                             |
| `tx_connTable2ibh_rsp`     | `connTableEntry`             | 连接表返回的 **远端连接信息**                                         |
| `rxIbh2stateTable_upd_req` | `rxStateReq`                 | RX 侧对 **状态表** 的更新请求（epsn、retry）                           |
| `txIbh2stateTable_upd_req` | `txStateReq`                 | TX 侧对 **状态表** 的更新请求（next-psn）                             |
| `qpi2stateTable_upd_req`   | `ifStateReq`                 | QP 接口初始化/修改 QP 状态                                         |
| `stateTable2rxIbh_rsp`     | `rxStateRsp`                 | 状态表给 RX 的 **QP 状态**（epsn、retry）                           |
| `stateTable2txIbh_rsp`     | `stateTableEntry`            | 状态表给 TX 的 **QP 状态**（next-psn）                             |
| `stateTable2qpi_rsp`       | `stateTableEntry`            | 状态表给 QP 接口的 **QP 状态**                                     |
| `rxExh2msnTable_upd_req`   | `rxMsnReq`                   | RX 更新 **消息序号表**（msn、vaddr、len）                            |
| `txExh2msnTable_req`       | `ap_uint<16>`                | TX 查询 **消息序号表** 获取 r_key/msn                              |
| `if2msnTable_init`         | `ifMsnReq`                   | QP 接口初始化 **消息序号表**                                        |
| `msnTable2rxExh_rsp`       | `dmaState`                   | MSN 表返回给 RX 的 **dma 上下文**                                 |
| `msnTable2txExh_rsp`       | `txMsnRsp`                   | MSN 表返回给 TX 的 **r_key/msn**                               |
| `exh_lengthFifo`           | `ap_uint<16>`                | 扩展头长度，给 `ipUdpMetaHandler` 计算 CRC                         |
## 数据流通
![[Pasted image 20251119104235.png]]
本文档会以数据流的逻辑进行梳理，帮助读者梳理关于代码的相关内容。
# 逻辑梳理
我们首先从互联网部分获得一个数据包，我们需要对数据包进行基本的处理，获取这个数据包的元数据，这个部分由`rx_process_ibh`进行
## rx_process_ibh
**参数**：
```C++
    // Input stream for incoming RDMA-packets
    stream<net_axis<WIDTH> >& input,
    // First output stream for meta information - contains opcode, partition key, destination qp, psn, validPSN and packet number
    stream<ibhMeta>& metaOut,
    // Second output stream for meta information - only the opcode
    stream<ibOpCode>& metaOut2,
    // Output for packets for further processing
    stream<net_axis<WIDTH> >& output,
    // Counter for packets? - Investigate!
    ap_uint<32>&        regIbvCountRx
```
**函数详解**：本函数负责解析包的第一个word，解析其中的BTH header部分，并输出meta信息，与此同时将packet写入output进行下一步的处理，本模块包含状态机，处理包后会清除状态机。

## rx_ibh_fsm
**参数**：
```C++
    // Base Transport Header, received from rx_process_ibh
    stream<ibhMeta>& metaIn,
    // NAK-bit (and pkg-number), received from rx_process_exh
    stream<exhMeta>& exhMetaFifo,
    // Input from the state table: has information on epsn (expected ? psn), oldest outstanding psn, max_forwarding and retryCounter - has to do with handling retransmissions
    stream<rxStateRsp>& stateTable_rsp,
    // Output to the state table: has information on qpn, epsn, retryCounter and bools for isResponse and WRITE
    stream<rxStateReq>& stateTable_upd_req,
    // Passes on the BTH from rx_process_exh to the stream-merge module
    stream<ibhMeta>& metaOut,
    // Output to the stream merge module: Ack-event with information on qpn, psn, valid signal for psn, NAK-bit
    stream<ackEvent>& ibhEventFifo,
    // Output to ipUdpMetahandler: Single Bit to show if packet should be dropped
    stream<bool>& ibhDropFifo,
    // Output to ipUdpMetahandler: Single bits for drop and ack.
    stream<fwdPolicy>& ibhDropMetaFifo,
    // Output to rx_exh_fsm: One bit rd (no idea for what), qpn, psn
    stream<ackMeta>& m_axis_rx_ack_meta,
#ifdef RETRANS_EN
    stream<rxTimerUpdate>&  rxClearTimer_req,
    stream<retransUpdate>&  rx2retrans_upd,
#endif
#ifdef DBG_IBV_IBH_FSM
    stream<psnPkg>& m_axis_dbg,
#endif
    // Counter for dropped packets
    ap_uint<32>&        regInvalidPsnDropCount
```
**函数详解**：模块从上级的rx_process_ibh获取BTH和PSN，结合信息判断包是否需要丢弃，是否需要发送ACK，是否发送NACK，如何更新状态表，是否向后继续转发此包。总的来说，这个模块用于实现PSN相关的内容。

## rx_exh_fsm()