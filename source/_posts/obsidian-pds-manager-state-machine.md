---
title: "PDS管理器状态机"
date: "2025-07-31 10:51:33"
updated: "2025-08-01 10:29:01"
obsidian: true
categories:
  - "网络体系结构"
tags:
  - "论文阅读"
  - "网络体系结构"
  - "UEC"
  - "PDS"
  - "状态机"
---
![[Pasted image 20250731105144.png]]
## 概述
PDS管理器主要用于管理整个PDS层的行为，主要在于接受上级的请求，控制每个PDC的运行，在[[PDS部分（packet delivery sublayer）]]中我们已经知道每一次链接对应双方各一个PDC，如何在整个系统运行之中控制每一个PDC的运行就成了PDS管理器的一部分，不仅如此，PDS管理器还有负责向上的部分。本笔记主要目标是梳理整个管理器状态机的运行逻辑。
## 整体架构简述

- 所有的状态都从IDLE启动
- 状态均使用**事件驱动**和 **条件判断**为基础执行
- 状态之间使用不同事件和布尔条件进行触发
- 图中使用了关键颜色标注：
	- 蓝色：**PDC 状态机接口（例如：pdc_close***）；
	- 绿色：**SES 接口（例如：ses_pds_tx_req）**；
	- 橙色：**网络输入（rx_pkt）**；
	- 黑色实线箭头：**状态跳转逻辑**；
	- `UCT`：无条件跳转（Unconditional Transition）。
## 状态详解

- **INIRIALIZE状态**：
	- 初始化配置：
		- `open_cnt = 0`：表示当前开启的 PDC 数；
		- `pend_cnt = 0`：表示排队等待中的 PDC 数；
		- `closing_cnt = 0`：正在关闭的数量；
	-  读取配置项：
	    - `Max_PDC`：最大允许的 PDC 数；
	    - `Pend_Timeout`：等待队列超时时间；
	    - `Close_Thresh`：触发释放机制的阈值；
	- 跳转到 **IDLE 状态**

- **IDLE状态**：
	从这个状态开始，系统会根据不同的事件前往不同的状态并且处理各种情况：
	- `ses_pds_tx_req` → 进入 **SES TX REQ**
	- `rx_pkt` → 进入 **RX PKT**
	- `ses_pds_tx_rsp` → 进入 **SES TX RSP**
	- `pdc_close*` → 进入 **CLOSE & PEND DEQ**
	- `pend_time == EXPIRED` → 进入 **PEND TIMEOUT**
	- `pkt_deq == FALSE` → 进入 **RESOURCE CHECK**

- **SES TX REQ**（SES 向 PDS 请求发送）
	事件由SES层发来的ses_pds_tx_req进行触发
	**内部逻辑**
		1. 调用`assign_pdc()`
		2. 假如本地没有已经开启的PDC，而且没有OOR
			- 尝试分配PDC
			- 将`open_cnt++`
		3. 假如OOR：
			- 将数据包加入等待队列Pending Queue
			- 状态跳转到**TX OOR & PEND Q**
		4. 否则：
			-  生成消息 `msmsgp(msgid, $PDCID)`；
		    - 设置 `fwd_pkt = TRUE`（数据可以发送）
- **RX PKT**（接收到网络包）
	- **由网络事件rx_pkt包触发**
	- **内部逻辑**
		1. 检查PDC
		2. 假如发现意外则将fwd_pkt设置为false
		3. 假如是有效请求：
			1. 假如PDC没有open而且没有OOR
				- 调用`alloc_pdc()`
				- `open_cnt++`
			2. 假如OOR，`fwd_pkt = FALSE`
			3. 否则`fwd_pkt = TRUE`
- **SES TX RSP**（SES 层传输响应）
	- **事件触发**：`ses_pds_tx_rsp`
	- **内部逻辑
		1. assign_pdc()
		2. 如果无效：
			1. 通知SES错误，记录
			2. 丢弃数据包
		3. 否则： `fwd_pkt = TRUE`
- **TX OOR & PEND Q（发送方向 OOR 且入队）**
	- **内部逻辑**：
		1. 将数据包 `pend_pkt()` 加入 Pending 队列；
		2. 设置超时计时器 `pend_time = Pend_Timeout`；
		3. `pend_cnt++`
		4. 如果队列已满，则 `pause_ses = TRUE`
- **FWD PKT TO PDC（转发数据包至 PDC）**
	- 只要有任一数据包到达即可触发
		- `ses_tx_req || rx_pkt || ses_tx_rsp` 且 `fwd_pkt = TRUE`
	- 将数据包发送到对应的PDC状态机
