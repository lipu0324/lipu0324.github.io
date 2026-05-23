---
title: "CUDA 内存层次与异步执行"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "CUDA"
  - "GPU"
  - "内存管理"
---
# CUDA 内存层次与异步执行

## CUDA 内存层次

CUDA 中常见存储层次：

| 内存 | 作用范围 | 特点 |
|---|---|---|
| register | 每线程私有 | 最快，数量有限 |
| local memory | 每线程私有 | 可能位于 global memory，延迟较高 |
| shared memory | block 内共享 | 片上、低延迟、小容量 |
| global memory | 全局 | 显存，容量大、延迟高 |
| constant memory | 全局只读 | 对广播式访问友好 |
| texture memory | 全局只读 | 对特定访问模式有缓存优化 |
| L2 cache | 全 GPU | 缓存 global memory 访问 |
| unified memory | CPU/GPU 统一地址空间 | 易用，但可能发生迁移开销 |

## Shared Memory 与 Global Memory

shared memory 是 block 内线程共享的片上内存，延迟低但容量有限。global memory 是设备显存，所有线程都能访问，容量大但延迟高。

不同 block 不能直接共享 shared memory。跨 block 共享数据通常需要通过 global memory，并在 kernel 边界或特殊同步机制处保证顺序。

## Global Memory Coalescing

global memory coalescing 指同一个 warp 中相邻线程访问连续、对齐的 global memory 地址时，硬件可以把访问合并成较少的 memory transactions。

访问友好：

```cpp
float x = a[idx];
```

相邻线程访问相邻地址。

访问较差：

```cpp
float x = a[idx * stride];
```

如果 `stride` 很大，相邻线程访问分散地址，memory transactions 增多，带宽利用率下降。

## Register 与 Local Memory

register 是每线程私有且最快的存储。

local memory 也是每线程私有的地址空间，但物理上通常位于 global memory 中，延迟高。常见来源：

- 寄存器不足导致 spilling。
- 局部数组无法放入寄存器。
- 动态索引使编译器无法标量化。

## Stream

CUDA stream 是 GPU 操作队列。

特点：

- 同一 stream 内操作按提交顺序执行。
- 不同 stream 在依赖允许、资源允许时可能并发执行。
- 可用于 overlap kernel execution 和 data transfer。

## Event

CUDA event 是 stream 时间线上的标记点。

用途：

- 计时。
- 同步。
- 建立跨 stream 依赖。

## Kernel Launch 的异步性

kernel launch 通常是异步的。host 提交 kernel 后不等待 GPU 执行完成，可以继续执行 CPU 侧代码或提交后续 GPU 工作。

```cpp
add<<<blocks, threads>>>(a, b, c, n);
cudaDeviceSynchronize();
```

`cudaDeviceSynchronize()` 会阻塞 host，直到当前 device 上此前提交的工作完成，并返回异步执行中发生的错误。

如果只需要等待某个 stream：

```cpp
cudaStreamSynchronize(stream);
```

## 异步错误

kernel launch API 返回成功不一定代表 kernel 执行成功。许多错误发生在 GPU 后续执行阶段，例如 illegal memory access，可能在后续同步 API 或下一次 CUDA API 调用时才暴露。

实践中应检查：

- kernel launch 后的错误状态。
- stream 或 device synchronize 的返回值。
- 数据拷贝和内存分配 API 的返回值。
