---
title: "PDS管理器状态机代码笔记"
date: "2025-08-11 16:43:05"
updated: "2025-08-13 11:02:24"
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
## 总体逻辑

本质上还是使用固定的优先级处理各个队列的请求，未来是否会采用优先级调度算法来优化还是未知数。本质上大部分的处理都跟随以下逻辑顺序：
1. 拿到请求
2. 分配PDC
3. 处理具体的请求

## 各个函数内容以及处理逻辑

本节主要描述各个函数的内容以及其输入输出，还有一些关于函数未来开发方向的内容。

### int mux_tx_to_pdc_id(struct ses_tx *tx)

函数功能：为请求分配pdc_id
函数实现：求和取模
输入值：tx请求的结构体
返回值：PDCID的数值
TODO：未来需要修改分配方法。

### bool alloc_pdc(int pdc_id)

函数功能：根据pdcid分配PDC
函数实现：根据PDC编号寻找PDC，根据该PDC是否开启修改PDC开启位。
输入值：pdcid
返回值：是否成功
TODO：可能有多种实际逻辑。

### bool is_OOR()

函数功能：确认PDC有没有用完
函数实现:查看PDCID计数是不是比最大数还大。
返回值：是不是越界了
TODO：肯定要改，这个方案不合理

### bool pdc_open(int pdc_id)

函数功能：用来测试PDC是不是已经打开了
函数实现：读取PDC结构体内部的bool数值
返回值：布尔值
TODO：这是模拟实现，实际上需要结合PDC结构进行处理

### void msgmap(struct ses_tx *tx,int pdc_id)

函数功能：将消息ID与PDC进行关联
函数实现：目前是模拟的
输入值：消息ID和PDCID
TODO：我认为这个函数的主要作用还是对消息与PDC的映射，可能需要实现一个类似于位图的方式来进行对照，但是目前没有什么头绪。

### bool assign_pdc(struct ses_tx *tx, int *pdc_id)

函数功能：分配PDC的算法
函数实现：简单分配方式，根据内容计算对应的PDC，假如PDC已经打开就直接使用，假如未打开就分配，于此同时假如是REQ请求也不打开。
输入值：消息结构体`ses_tx`，pdcid的地址
返回值：分配是否成功的bool值
TODO：整个分配逻辑和id映射逻辑都是有问题的，需要修改。

### void fwd_pkt_to_pdc(struct pkt_to_pdc *pkt)

函数功能：将请求发给PDC处理数据
函数实现：暂时没实现，需要和PDC部分进行对接
输入值：结构体`pkt_to_pdc`
TODO：未来需要和PDC部分对接

### void pds_manager_sm_init()

函数功能：用于初始化状态机，主要是设置各个标志位。
函数实现：就是一系列赋值语句
TODO：可能随着未来开发需要增加初始值的内容和个数

###  bool pend_q_full() 

函数功能：检查等待队列是不是满了
返回值：bool

### int select_pdc_2close()

函数功能：选择一个需要关闭的PDC
函数实现：使用第一个打开的PDC关闭
返回值：PDCID或者0
TODO：可以使用一些别的手法来确定需要关闭的PDC，有改进的空间

### void pend_timeout(pend_node node)

函数功能：处理超时的pend_node
函数实现：没有实现，需要补充
输入值：node节点
TODO：需要维护代码，实现具体功能

### void resouce_check()

函数功能：检查系统资源状态, 处理待处理队列中超时的任务, 在需要时通过关闭某些 PDC 来释放资源,维护系统资源平衡
函数实现:
1. **资源管理模式**：
    - 使用计数器（`open_cnt`, `closing_cnt`, `pend_cnt`）跟踪资源状态
    - 基于阈值（`Close_Thresh`）进行资源管理决策
    - 使用队列（`pend_q`, `close_q`）进行请求缓冲和异步处理
2. **超时处理机制**：
    - 使用 `is_pend_node_over_time()` 函数检测任务是否超时
    - 对超时任务执行特定的处理逻辑（丢弃并记录）
3. **状态机设计模式**：
    - 函数结束时调用 `pds_manger_sm_process()` 继续处理状态机的其他部分
    - 整个系统通过状态转换和队列处理实现异步操作
TODO：暂时不知道需要修改什么

### pend_node create_pend_node(struct ses_tx tx)

函数功能：用于创造一个等待节点，用来管理资源不足暂时挂起的传输请求，例如在OOR时，新下发的请求会被放到pend_node之中。
函数实现：输入一个请求，返回一个pendnode，pendnode中包括等待时间，等待开始时间，等待结束时间等。
输入值：结构体ses_tx
输出值：pend_node
TODO：无

### void tx_oor_pend_enqueue(struct ses_tx *tx)

函数功能：将需要等待的请求节点放进队列中
函数实现：没啥好说
输入值：结构体ses_tx
TODO：无

### void send_error_to_ses()

函数功能：出错的时候向上汇报
函数实现：还没写
TODO：基本根据实际情况重来

### void ses_error_process(struct error_event *err_event)

函数功能：处理错误事件
函数实现：需要完善
输入值：结构体 error_event
TODO：跟随开发进度进行完善

### void ses_tx_req(struct ses_tx *tx)

函数功能：处理发送的逻辑，包括选择tx，选择pdc，执行任务，判断等，主要是之前所描述的函数的排布。
函数实现：基本是各类标识符和处理逻辑的综合。
输入值：结构体ses_tx
TODO：基本没有，耦合性很低

### void drop_packet()

函数功能：丢弃需要的包
函数实现：还没有实现
TODO：这个函数需要编写

### void ses_tx_rsp(struct ses_tx *tx)

函数功能：处理RSP请求，主要是数据接受和向上反馈
函数实现：基本有流程上的构成
输入值：结构体 ses_tx
TODO：将每个消息 ID 与消息开头 （som） 的 PDC 相关联的逻辑等待实现

###  bool check_rx_pkt(struct ses_rx *rx)

函数功能：用于检测收到的包是不是合法的
函数实现：检查了包的状态范围
输入值：结构体 ses_rx
输出值：bool
TODO：包合法方面的检测应该包括其他部分例如CRC校验之类的？

### void send_nack(ses_rx *rx)

函数功能：返回nack
函数实现：返回成功数值
输入值：结构体 ses_rx

### bool check_unexpect_event(ses_rx rx)

函数功能：可能是实现未预料的事件检测？
函数实现：
输入值：结构体 ses_rx
TODO：根据项目情况重写

###  void unexpected_or_rx_oor(struct ses_rx *rx)

函数功能：处理接收（RX）过程中的异常情况或资源不足（OOR，Out Of Resources）的情况
函数实现：根据结构体选择是否发送
输入值：结构体ses_rx
TODO：感觉随着项目进展还需要进行修改

### void rx_pkt(struct ses_rx *rx)

函数功能：处理收到的包
函数实现：拿着包分配PDC和其他内容等，并伴随一些处理函数
输入值：结构体ses_rx
TODO：低耦合代码，应该不需要修改整体结构
