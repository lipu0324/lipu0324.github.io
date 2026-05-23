---
title: "虚拟内存、缺页与系统调用"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "操作系统"
  - "虚拟内存"
  - "系统调用"
---
# 虚拟内存、缺页与系统调用

## 虚拟内存

虚拟内存让每个进程看到独立的虚拟地址空间，程序不直接使用物理地址。虚拟地址通过页表映射到物理内存。

作用：

- 进程隔离。
- 内存保护。
- 按需分配。
- 简化程序地址布局。
- 支持换页。
- 支持 `mmap` 等文件映射机制。

低地址通常可能被保留为不可访问，用来捕获空指针访问，因此虚拟地址空间不等于从 0 开始全部可用。

## Page Table

页表保存虚拟页到物理页框的映射，以及权限位等元数据。

常见权限信息：

- readable。
- writable。
- executable。
- user/supervisor。
- present。
- dirty。
- accessed。

## TLB

TLB 是 Translation Lookaside Buffer，是 MMU 中的地址翻译缓存。

如果每次访存都查页表，开销会很高。TLB 缓存近期使用的虚拟页到物理页框映射，减少地址翻译成本。

## Page Fault

page fault 不一定代表程序错误。

常见情况：

- 合法缺页：页尚未加载到物理内存，需要操作系统调入。
- 权限错误：写只读页、执行不可执行页。
- 未映射地址访问：非法指针或空指针附近访问。
- copy-on-write：写共享页时触发复制。
- 文件映射：访问尚未载入的映射页。

## System Call

system call 是用户态程序进入内核态的受控入口。现代系统通常通过专门指令实现，例如 `syscall`、`sysenter` 或 `svc`。

用户程序不能直接访问硬件和内核资源，原因包括：

- 安全隔离。
- 资源仲裁。
- 权限控制。
- 防止破坏内核状态。
- 防止访问其他进程的数据。
- 为硬件提供统一抽象。

常见系统调用：

- `read`
- `write`
- `open`
- `close`
- `mmap`
- `ioctl`
- `fork`
- `exec`

## 普通系统中的计时不精确

如果程序循环 100 次，每次希望 sleep 1ms，通常不能保证精确运行 100ms。

原因：

- OS 调度。
- 上下文切换。
- timer granularity。
- 系统中断。
- 其他进程抢占 CPU。
- page fault。
- cache miss。
- CPU 频率变化。
- `sleep` 通常只保证至少睡到某个时间，不保证正好唤醒并运行。

提高精度的方法：

- 使用 high-resolution monotonic clock 测量 elapsed time。
- 使用绝对时间 deadline，而不是每轮相对 sleep。
- 提高线程优先级。
- 使用 real-time scheduling。
- 设置 CPU affinity 减少迁移。
- 使用 busy-wait，但会浪费 CPU。
- 硬实时需求使用 RTOS 或专用硬件 timer。
