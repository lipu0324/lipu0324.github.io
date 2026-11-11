---
title: 吴宗璞 | 简历
description: 吴宗璞的个人简历：教育背景、Ultra Ethernet 与 FPGA 项目、分布式软件实习经历和技术技能。
layout: resume
type: resume
pdf: /resume/wu-zongpu-resume.pdf
---

<div class="resume-identity">
  <p class="resume-label">PROFILE / lipu0324</p>
  <h1>吴宗璞</h1>
  <p class="resume-role">计算机科学与技术 · FPGA / Ultra Ethernet / 分布式软件</p>
  <ul class="resume-contacts">
    <li><span>github</span> <a href="https://github.com/lipu0324">lipu0324 (lipu233)</a></li>
    <li><span>email</span> <a href="mailto:zongpuwu0324@163.com">zongpuwu0324@163.com</a></li>
    <li><span>wechat</span> wzp020324</li>
    <li><span>phone</span> <a href="tel:18170652980">18170652980</a></li>
    <li><span>profile</span> 男 / 2002.03</li>
    <li><span>blog</span> <a href="https://lipu0324.github.io/">lipu0324's Blog</a></li>
  </ul>
</div>

## 教育背景

### 中国科学院大学 · 计算机科学与技术

<p class="resume-period">2024.09 - 2027.06</p>

成绩优异，GPA 3.48/4.0。获得中国科学院三好学生奖项，担任院学生会副部长职务。

### 东北林业大学 · 计算机科学与技术

<p class="resume-period">2020.09 - 2024.07</p>

获得校奖学金一次，担任班委职务。

## 项目经历

### Hard-UE：基于大规模 FPGA 的 Ultra Ethernet 智能网卡

<p class="resume-period">2025.12 - 至今 · 网络空间安全防御全国重点实验室</p>

中国科学院攻坚专项子课题

<p class="resume-stack">C++ / RDMA / FPGA / Xilinx HLS / Vivado</p>

基于 Xilinx FPGA 的智能网卡，面向 AI/HPC 集群 scale-out 通信，在网卡侧实现 Ultra Ethernet 协议的可靠传输卸载，目标是替代纯软件协议栈中的包处理、状态维护、重传和数据搬运开销，支持 100G 线速传输，基于 Versal VHK158 平台进行开发。

- 总体把控项目进展，分发任务与计划，推进团队协作。
- 负责将协议流程拆分为可综合、可测试、可复用的硬件模块，推进关键数据通路在 FPGA 开发板上的验证。硬件综合指将 HLS C++ 代码转换为 FPGA 上运行的电路。
- 实现请求分发、连接状态维护、包头生成、数据缓存、多路发送仲裁等核心模块（PDSManager），并维护数据包处理状态。
- 设计发送端数据缓存与搬运链路，连通上层协议、主机到网卡的数据传输通道和发送模块，统一多个模块的发送出口。
- 规划并设计包括 DMA 缓冲区管理模块、拥塞控制模块在内的多个模块，并对其优化，使其能够支持高速传输的需求。
- 通过缓存规划和流水线重构减少片上存储读写依赖，参与 IPDC/TPDC 模块升级。
- 将核心数据通路工作频率由 **150 MHz 提升至接近 250 MHz**；维护 Vivado Tcl/CMake 构建流程、HLS 工作管理脚本和约 1 万行技术/团队沟通文档。

### Soft-UE：Ultra Ethernet Transport C++ 软件模型

<p class="resume-period">2025.06 - 2025.12 · 网络空间安全防御全国重点实验室</p>

中国科学院攻坚专项子课题

<p class="resume-stack">C++ / Makefile / Ultra Ethernet</p>

源码：[github.com/lipu0324/Soft-UE](https://github.com/lipu0324/Soft-UE)

用 C++ 实现 Ultra Ethernet 高速网络协议的软件原型，用于 FPGA 开发前验证协议流程、模块边界和测试方法。项目语言以 C++ 为主，同时为开源社区带来 Ultra Ethernet 的首个公开模型。原简历记录：24 Stars / 2 Forks。

- 按语义层、可靠传输层、网络层、传输层、日志和测试模块组织代码，分离请求处理、连接状态、数据包交付、网络适配和测试逻辑。
- 实现读、写、发送等数据操作流程，覆盖请求解析、协议头初始化、大消息分片、包调度、序列号跟踪、连接生命周期管理、错误处理和资源释放。
- 完善连接分配、状态查询、关闭队列、确认/否认反馈、包序号跟踪和多类控制消息处理，修复连接关闭、队列管理和请求转发等问题。
- 完成上层接口联调，搭建分层测试框架，维护 Makefile 构建入口和测试用例，覆盖连接建立、数据注入与接收、消息分片、回调和自动连接释放。
- 输出可编译、可测试、可阅读的开源协议原型和项目文档，为后续硬件实现提供协议流程参考和测试依据。

## 工作经验

### 中科寒武纪科技股份有限公司

<p class="resume-period">2026.07 - 至今 · 分布式软件部</p>

**分布式基础软件开发实习生**

#### Horovod 软件跨版本升级适配

- 针对寒武纪特化版本 Horovod 插件进行功能适配，使其能够支持社区最新版本 Horovod 的功能和特性。
- 维护更新文档与开发文档，保证修改的可读性与可理解性。
- 使用各类 AI 工具编写代码并审查代码的可用性。
- 针对修改的代码进行实机测试。

#### Remote-EXEC-MCP 开发

- 为团队开发能标准化执行多机测试的 MCP。
- 收集同事反馈持续改进，优化 Agent 执行多机测试的可靠性。

#### CNSHMEM 通信接口开发

- 基于寒武纪 CNSHMEM 软件栈，开发通算融合算子 Baseline 与各类 perftest。
- 基于真实多卡环境优化通信算子性能。
- 编写基于 Agent loop engineering 的自动算子优化 skill。

## 技能

- **C++ 编程**：熟悉 C++ 基础知识，能用 C++ 开发包括嵌入式、FPGA、分布式软件在内的各种项目。
- **Vitis HLS**：能够使用 HLS 语言开发各类基于 Xilinx FPGA 的硬件模块，并进行测试与综合。
- **Verilog / SystemVerilog**：掌握基本的 Verilog 语法和硬件开发思想。
- **Vivado**：能使用 Vivado 软件进行 FPGA 的测试、开发与仿真。
- **计算机网络**：掌握 UE 协议的技术细节，了解 PFC、DCQCN 与 ECN 的运行原理。
- **嵌入式开发**：熟悉 STM32 的开发环境与开发工具，参与过实际 STM32 项目开发。
- **开发工具**：熟悉 Git、Linux 以及各类 AI Coding 工具，并有着丰富的使用经验。

## 个人优势

- **熟悉计算机体系结构**：对处理器架构、指令集、乱序发射与分支预测等知识进行过学习并充满兴趣。
- **拥有大型项目开发经验与团队协作经验**：擅长团队协作与项目管理，通过在线文档与自有 Git 仓库同步团队进度，进行大型项目的开发，同时擅长沟通与协作。
- **快速切入不同领域项目的能力**：能借助各类工具与文档，快速切入陌生领域的工作。
- **拥有顶层思考能力**：着眼于全局，能够分析项目中存在的不足以及可改进之处。
- **热爱学习掌控新技术**：人工智能时代，技术进展日新月异，持续掌握新技术与新方法。
- **热爱动手实操**：长期运行 HomeLab，擅长使用 Linux 与命令行达成开发目的。
- **了解网络体系结构**：包括传统网络协议在 AI 时代的弊端以及前沿改进方向。
