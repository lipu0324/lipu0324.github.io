---
title: "CUDA 执行模型"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:27:06"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "CUDA"
  - "GPU"
---
# CUDA 执行模型

## Host、Device 与 Kernel

CUDA 是一种面向 GPU 的并行计算平台和编程模型。

- host：CPU 侧代码和主机端运行环境。
- device：GPU 侧设备。
- kernel：由 host 发起、在 device 上由大量线程并行执行的函数。

CUDA kernel 使用 `__global__` 声明：

```cpp
__global__ void add(float* a, float* b, float* c, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        c[idx] = a[idx] + b[idx];
    }
}
```

`__global__` 表示该函数由 host 调用，在 device 上执行。

## Thread、Block 与 Grid

CUDA 的线程组织层次：

```text
Grid
  -> Block
      -> Thread
```

- thread：执行 kernel 的最小逻辑单元。
- block：一组线程，同一个 block 内线程可以共享 shared memory，并使用 `__syncthreads()` 同步。
- grid：一次 kernel launch 中的所有 block。

一个 block 会被调度到一个 SM 上执行。不同 block 的调度顺序和并发关系不固定，因此一个普通 kernel 内不同 block 之间通常不能直接同步。

## 全局线程下标

一维数组处理中常用：

```cpp
int idx = blockIdx.x * blockDim.x + threadIdx.x;
```

含义：

- `blockIdx.x`：当前 block 在 grid 中的一维编号。
- `blockDim.x`：每个 block 的线程数。
- `threadIdx.x`：当前线程在 block 内的一维编号。
- `idx`：当前线程负责处理的全局数组下标。

示例：

```text
blockDim.x = 256
blockIdx.x = 2
threadIdx.x = 10
idx = 2 * 256 + 10 = 522
```

该线程负责处理 `a[522]`、`b[522]`、`c[522]`。

## Block 数计算

如果每个线程处理一个元素，启动线程数需要覆盖全部 `n` 个元素。

```cpp
int threadsPerBlock = 256;
int blocks = (n + threadsPerBlock - 1) / threadsPerBlock;
add<<<blocks, threadsPerBlock>>>(a, b, c, n);
```

公式：

```text
blocks = ceil(n / threadsPerBlock)
```

整数写法：

```cpp
blocks = (n + threadsPerBlock - 1) / threadsPerBlock;
```

总线程数：

```cpp
totalThreads = blocks * threadsPerBlock;
extraThreads = totalThreads - n;
```

由于总线程数可能大于 `n`，kernel 内需要边界检查：

```cpp
if (idx < n) {
    c[idx] = a[idx] + b[idx];
}
```

## 示例

```text
n = 1000
threadsPerBlock = 256
blocks = (1000 + 256 - 1) / 256 = 4
totalThreads = 4 * 256 = 1024
extraThreads = 24
```

最后 24 个线程的 `idx >= n`，会被 `if (idx < n)` 挡住。

## Warp 与 SIMT

GPU 硬件通常以 warp 为单位调度线程。常见 CUDA 设备中一个 warp 通常包含 32 个线程。

SIMT 是 Single Instruction, Multiple Threads。一个 warp 中的线程执行同一条指令流，但每个线程有自己的寄存器和数据。

warp 数向上取整：

```cpp
warps = (threads + 32 - 1) / 32;
```

示例：

```text
threads = 256 -> 8 warps
threads = 250 -> 8 warps，最后一个 warp 只有 26 个 active lanes
```

## Warp Divergence

如果同一个 warp 内线程走不同分支，就会发生 warp divergence。

```cpp
if (threadIdx.x % 2 == 0) {
    // path A
} else {
    // path B
}
```

同一个 warp 中一半线程走 A，一半线程走 B。硬件需要分别执行两个路径，并 mask 掉当前路径不活跃的线程，效率下降。

不是所有分支都会造成严重 divergence。关键是同一个 warp 内是否分裂到不同路径。

边界判断通常影响较小：

```cpp
if (idx < n) {
    ...
}
```

因为它通常只影响最后一个不满的 block 中少量线程。
