---
title: "UEC白皮书阅读：总体架构与数据路径"
date: "2025-08-26 15:19:44"
updated: "2025-09-01 09:52:39"
obsidian: true
categories:
  - "网络体系结构"
tags:
  - 论文阅读
  - UEC
  - 网络体系结构
---
## UEC总体结构

在进行文献阅读以后，我对UEC的定义是：一个可以运行在当前网络体系结构下的面对AI发展的全新网络架构，底层的承载来自于IP协议以及其配套的协议。

### UEC包的结构
![[Pasted image 20250826152332.png]]

在本图中我们可以清晰的发现，这个包本身属于现有互联网体系的一部分，属于二层包的一部分，允许其运行在现行的互联网中。
从上到下，这个数据包的内容包括：L2头，也就是数据链路层头，L3头就是IPV4或6的头，标志其本身就在IP环境下进行运行，L4包括一些应用层的数据，包括UDP头和UET所在的端口，这表明UEC运行过程中只需要占用一个端口即可。
![[Pasted image 20250826161901.png]]这就是一个典型的包头。

## UEC系统总览

![[Pasted image 20250826172606.png]]
这张图表明了UEC在整个系统中运行的情况以及所处的位置，每一个cluster中有多个节点，每个节点中有一个fabric interface，在fabric interface中有FEP，可能是一个或者多个，每个FEP代表一个逻辑网络节点，在FEP中存在ccc流量控制和pdc相关的内容。与此同时，fabric interface中还可能占据一个或者多个端口，这个端口应该是普通IP网络中的端口。在右侧则是链路和交换机相关的内容，表示可能拥有多平面网络等相关内容。

## 数据的传输路径

#### 1) 应用 / 进程 发起（User → OS → FI）
- 应用调用 libfabric / ULP 接口生成一个请求（例如 RDMA read / message send）。
- 应用对应一个或多个 FEP（由 OS/FI 映射到某个 PASID 的 FEP）。调用到 FI 后，FI/SES（语义层）把高层语义打包成 SES 请求，可能进行分片。
#### 2) SES → PDS（在本节点的 FI 内）
- SES 将消息封装成 PDS 请求（填好 `pds.*` 字段：spdcid、dpdcid、psn、mode（RUD/ROD）等）。
- 如果是首次连接，可能会带 `SYN` 标志触发 PDC 建立流程（PDCID 的分配/握手）。
- PDS 层会与 CCC/拥塞管理交互以决定发送速率与路径（TX rate、选择哪个 port / path）。
#### 3) PDS → Port（选择物理端口并发送）
- PDS/CCC 根据当前状态选择一个 Port（或多个 Port 做多路径发包），将封装后的 IP/UDP/TSS/PDS/SES 堆栈交付给 NIC 硬件（或驱动）发送。
- NIC 在以太网层发出帧，经物理 link 到交换机。
#### 4) Fabric 转发（Switch / Path）
- 交换机根据以太网/IP/UDP 等头做转发，ECMP/哈希使用 UDP 源端口（entropy）来做负载均衡，可能沿不同路径（图中不同 plane）到达目标。
- Fabric plane 的存在可以提供多条并行路径（提高吞吐、路径冗余）。
#### 5) 目标 NIC / Port 接收（到目标 FEP）
- 目标 NIC 收到帧，交给本地 FI 的 PDS 层（先经 TSS 解密/验证，如果启用安全）。
- PDS 读取 `pds.spdcid`（源方 PDCID）与 `pds.dpdcid`（目的 PDCID）并查找本地 PDC 条目（通过 `{ip.src_addr, pds.spdcid}` 映射或直接通过 dpdcid 索引）。
    - 如果 PDC 尚未建立且包带 SYN，则触发 PDC 建立流程（分配本地 TPDCID，返回 ACK/NACK）。
    - 如果资源不足或包不合法，返回 NACK（并可能丢弃包）。
#### 6) 目标 SES 处理并产生响应
- 目标的 SES 接收解包后的请求，将业务逻辑执行（例如读取内存、构造响应数据）。
- 对于**小响应**，SES 可能把数据直接嵌入到 PDS ACK 中返回（以节省开销）。
- 对于**大响应**，SES 会调用 `ses_pds_tx_rsp` 发起回程 `PDS Request`。
#### 7) 回程：目标作为发送方把响应送回发起端
- 目标端的 PDS/CCC 选择合适 Port/路径（可能与前向路径不同），并发送包含响应数据的 PDS 请求或 ACK。
- 回程上的大包会走拥塞控制路径（回程方向的 CCC 生效），小数据则可用 ACK 携带（回程上通常也有自己的 PDC 与 PSN 空间）。
#### 8) 发起端接收响应并交付应用
- 发起端 PDS 接收回程包，查找相应 PDC，做重组/选择性重传处理（如果有丢包或乱序），再把完整的 SES 响应传给上层 SES，最终由 libfabric/应用收到完成事件。

## 多平面网络和多端口FEP

![[Pasted image 20250827095653.png]]
在UEC中，通过多端口fep，可以达成多个平面的数据传输，以本图为例子，所有的机器都拥有多端口FEP，可以分别连接到两个或者多个不同的fabric平面，也就是两个不同的fabric拓扑，系统可以利用多平面做负载均衡或者多路冗余。
右侧 Node D 的 FEP 特别标明了几个多端口机制：
- **LAG (Link Aggregation Group)**：
    - 类似以太网的 LAG，把多个物理链路聚合为一个逻辑链路，提高带宽和冗余性。
- **Split Multi-Link LAG**：
    - LAG 的增强版，把多个链路分布在不同的交换机或不同的 Fabric plane 上，进一步增强冗余。
- **ISL (Inter-Switch Link)**：
    - 交换机之间的链路，用于在 Fabric 内部传输流量。
**作用**：
- FEP 可以通过多个 port 同时接入 **不同 Fabric plane**，实现高可靠性和冗余；
- 也可以把多个 port 聚合成一个 LAG，提升单连接的带宽上限。

![[Pasted image 20250828091528.png]]
这里可能存在一个todo，也就是说需要自己确定多端口主机的端口选择模式 ^0ab4c1

## PIDonFEP

在文档p41页中，我们有![[Pasted image 20250828191344.png]]
那么如何进行PIDonFEP的计算也成了需要解决的问题之一，目前认为这个步骤应该交给SES层进行计算。这句话的指的是作业的进程使用的编号是RankID，而进程在FEP中的标记是PIDonFEP。

![[Pasted image 20250828173917.png]]![[Pasted image 20250828184720.png]]在之前的阅读中已经明白这几个部分应该存在于包头中。

## 路由相关

根据文档内容，UET希望来自相同PDC、具有相同熵值和流量类别的两个数据包沿相同路径传输。

## 负载相关

UEC本身属于用于解决大规模AI运算的网络架构，研究所承载的网络流量的类型，以及其流量特性是十分重要的内容之一。[[大模型中推理与训练场景中的并行模式与负载特征]]
1. 数据并行：小批量的示例通过多个模型的副本进行处理，其中的参数通过allreduce进行同步。
2. 流水线并行pp：每个流水阶段都是模型的一组层，在不同的处理器上的相同层之间执行正向的激活通信和反向的错误通信，形成点对点通信的流水线。
3. 算子并行
在这些并行模式下，UEC需要支持接近150-200G字节每秒的速度。

### 推理负载

推理的要求远小于训练，只需要16Gbit/s就行。但是由于目前对这方面的知识储备不足，所以需要在未来阅读更多的AI相关的论文等。

## Fabric网络与UEC的工作情况
![[Pasted image 20250828195609.png]]

软件和算法通过OFI（libfabric OpenFabrics）抽象层与下层沟通，OFI是一个用户态的通信接口库，它能够抽象底层网络硬件。在OFI的控制下，可能使用由UEC提供的服务，或者选用其他服务提供商的服务。在内核中可以选用linux内核代码或者UE提供的网络栈。
1. 用户应用（TensorFlow/PyTorch/MPI/CCL 等）调用通信库；
2. 通信库通过 **libfabric (OFI)** API 发起操作；
3. libfabric 根据配置选择：
    - **UE vendor provider** → 调用 UE 驱动；
    - **other provider** → 调用非 UE 驱动；        
4. 内核层：
    - 要么走 **NetDev 标准网络栈**（兼容性）；
    - 要么走 **UE Vendor Driver**（高性能路径）；    
5. 最终请求下发到 **UE Vendor FEP 硬件**，由硬件完成数据传输。

## 交换机内部结构
![[Pasted image 20250829092001.png]]
UEC网络运行在当前的网络架构上，所以其交换机可以使用标准的以太网交换机，但是在交换机层面也可以通过支持一些特殊的UE特性来达到提高效率的效果。例如数据包修剪等。以本图为例子，SDN控制器控制用户空间中的容器等，同时控制UE部分的一些功能，软件定义网络控制器可以是 UE 实现的一部分,但不属于 UE 规范的范围。

## 网络

我们都知道人工智能时代的网络扩展包括前端网络，后端横向扩展网络和纵向扩展网络这几种。
1. 前端网络：指的是数据中心的操作网络，将计算节点连接到外部世界。前端网络基本可以理解为当前的互联网，虽然有改进的趋势但是不一定在近期实现。前端网络承载两种类型的流量，分别是南北向与东西向，分别代表用户与服务，服务与服务之间的交流。
2. 后端网络：后端网络相比前端网络是范围有限的高性能专用网络，部署在集群之中，所以也被称为横向扩展网络，后端横向扩展网络通常形成自己的三层子  网,并且通常不直接连接到前端网络。前端和后端网络之间的通信通常通过计算节点进行,这  些计算节点具有连接到两个网络的网络接口。
3. 纵向扩展网络：纵向扩展网络通常是非常专业的短距离互连,通常只有一个交换机层,或者可能根本没有交换机，我们一般说这种网络是在芯片内部进行数据传输的。
![[Pasted image 20250829141800.png]]
![[Pasted image 20250829142613.png]]
总的来说，UET希望达到如上表示的效果。

### 网络结构
本节主要说明UET的网络结构设计，通过以太网交换机和一些其他的组件，能够构成能够运行UET的网络架构。
1. 控制平面：负责运行路由协议，维护交换机之间的通信，由NOS（网络操作系统）等进行控制。![[Pasted image 20250829142931.png]]
2. 数据平面：负责网络中的数据包转发，此层涵盖UE端点(即FEP)和网络  交换机。为清楚起见,数据平面不控制或管理UET FEP。此层包含交换机硬件的低级抽象,  并负责根据控制平面提供的转发信息转发数据包。
3. 管理平面：负责保证交换矩阵正常可靠安全运行。负责管理系统协议执行软件升级等功能。

## LibFabric映射
![[Pasted image 20250829155927.png]]
流程如下：
1. 可信作业启动器创建作业并且分配JobID，维护job与实体之间的映射关系，包括Service Name、OS PID、UET 地址、Security Bindings等
2. 应用通过中间层与libfabric进行通信
3. 用户态提供各种功能，厂商特有的用户态 provider（实现 libfabric provider API）会把应用请求和 JobID 映射结合，调用厂商提供的低级 NIC 库（vendor HW lib）进行设备编程（例如在 NIC 上创建队列、配置 PDC、分配 PASID、下发 Job 权限等），并尽可能做 kernel bypass 以提高性能。
4. 内核空间接受来自jobid的映射请求，转发到硬件部分
5. 硬件部分负责所有的内容转发。

## 地址分配架构
![[Pasted image 20250901091626.png]]

### 参与组件（从上到下）

- *_Applications / HPC & AI Middleware（MPI/SHMEM/_CCL）__  
    调用 libfabric 接口创建 endpoint，需要一个“可在 UET 上通信的地址”和与之绑定的安全/作业身份。
- **libfabric Core + Vendor UET Provider + Vendor Low-Level NIC HW Library**  
    Provider 负责把应用意图落到具体硬件；Low-level 库负责对 NIC 做具体编程（支持 kernel-bypass 的快速路径）。
- **Privileged User Process（与集群 Provisioning 系统通信的特权代理）**  
    负责**权威地**为本机进程申请/下发 UET 地址、JobID 和安全绑定。
- **Kernel Driver（内核驱动）**  
    做**校验与落地**：核实请求者身份，把 Job/Security 信息写入 NIC，成为硬件强制执行的依据。
- **NIC Hardware（FEP/NIC）**  
    存放经过验证的 Job/Security 表项；后续数据面（PDS/PDC/TSS）据此做访问控制、加解密等。

### 时序 1 → 5（红色圆点序号）
**(1) 应用侧发起本机请求 → Kernel Driver**
- 由 provider/low-level 库向内核发送“地址/服务绑定”请求：  
    `Request: { IP Addr, Service }`  
    含义：本机哪个 **服务/端点** 需要一个 **UET 地址**（IP 是本机/管理用地址，用于标识/路由控制面）。
**(2) Kernel Driver → Privileged User Process（UET Ctrl Request）**
- 内核把请求升级给本机特权代理并补充**进程身份**：  
    `UET Ctrl Request: { IP Addr, OS PID, Service }`  
    加上 **PID** 是为了让控制面能把地址/凭证精确地绑定到指定进程（避免越权）。    
**(3) Privileged User Process ←→ Provisioning，返回 UET Ctrl Response → Kernel Driver**
- 代理与集群的 Provisioning 系统交互，做授权与分配，返回：  
    `UET Ctrl Response: { UET Addr, Job ID, Security Bindings }`
    - **UET Addr**：在 UE/Fabric 上用于通信的终端地址（FA）。
    - **Job ID**：该进程所属作业的身份，用于资源/隔离/计费。
    - **Security Bindings**：与该地址/作业绑定的安全材料（如 TSS 密钥索引/证书/令牌、允许的操作/TC 等策略)。
**(4) Kernel Driver → NIC Hardware（写入硬件的权威状态）**
- 内核把经信任来源下发的材料写入 NIC：  
    `{ Job ID Validation Info, Security Bindings }`  
    NIC 随即在硬件表中建立/更新 **JobID→权限/密钥/队列** 的映射，后续数据面会**硬执**这些规则。
**(5) Kernel Driver → Vendor Low-Level 库（应答给用户态）**
- 把结果返回给用户态库/Provider（含 UET Addr/JobID 等）；Provider 继续创建 endpoint、PDC、队列等，并可走 **kernel-bypass** 快速路径进行后续数据传输。
> 右侧“Kernel Bypass”标注：控制面（分配/授权）仍经内核校验；**数据面**建立后可在用户态直接下门铃/发包，NIC 依据第 (4) 步写入的表项做强制访问控制与加解密。

## SES层
### 四种寻址方式
![[Pasted image 20250901095237.png]]