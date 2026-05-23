---
title: "CUDA Runtime API 与 Driver API"
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
# CUDA Runtime API 与 Driver API

## 两层 CUDA API

CUDA 常见 API 层次包括 Runtime API 和 Driver API。

Runtime API 更高层、更易用，常见于应用开发。Driver API 更底层、更显式，需要手动管理 device、context、module、function、memory 和 stream 等对象。

## Runtime API

典型 Runtime API 代码：

```cpp
cudaMalloc(&d_a, size);
cudaMemcpy(d_a, h_a, size, cudaMemcpyHostToDevice);
add<<<blocks, threads>>>(d_a, d_b, d_c, n);
cudaDeviceSynchronize();
cudaFree(d_a);
```

特点：

- 接口更简单。
- kernel launch 使用 `<<<grid, block>>>` 语法。
- 很多初始化和 context 管理由 runtime 隐式完成。
- 常用于普通 CUDA 应用开发。

## Driver API

Driver API 更接近手动搭建 GPU 执行环境。

典型流程：

```text
cuInit
-> cuDeviceGet
-> cuCtxCreate / retain primary context
-> cuModuleLoad
-> cuModuleGetFunction
-> cuMemAlloc
-> cuMemcpyHtoD
-> cuLaunchKernel
-> cuStreamSynchronize / cuCtxSynchronize
-> cuMemcpyDtoH
-> cuMemFree
-> cuModuleUnload
-> cuCtxDestroy
```

常见对象：

| 对象 | 含义 |
|---|---|
| `CUdevice` | GPU device handle |
| `CUcontext` | CUDA execution environment |
| `CUmodule` | 已加载的 PTX/CUBIN/fatbin 模块 |
| `CUfunction` | 模块中的 kernel 函数句柄 |
| `CUstream` | 异步执行队列 |
| `CUevent` | 同步或计时事件 |
| `CUresult` | Driver API 返回错误码 |

## CUDA Context

CUDA context 是 GPU 上的执行环境。它持有和管理：

- device memory allocations。
- loaded modules。
- kernel functions。
- streams。
- events。
- 错误状态。
- 执行状态。

可以类比为 GPU 侧的资源容器，但它不等同于操作系统进程。

Runtime API 通常隐式管理 primary context。Driver API 中通常需要显式创建、保留或销毁 context。

## Module 与 Function

Driver API 不直接使用：

```cpp
add<<<blocks, threads>>>(...);
```

而是先加载代码模块，再从模块中取 kernel function handle，最后通过 `cuLaunchKernel` 启动。

概念：

- `CUmodule`：加载进 context 的 PTX、CUBIN 或 fatbin。
- `CUfunction`：module 中的某个 kernel 函数句柄。

## PTX、CUBIN 与 fatbin

PTX 是 CUDA 工具链中的虚拟 ISA 或中间表示，可以由 driver 在运行时 JIT 编译到具体 GPU 架构。

CUBIN 是已经针对某个具体 GPU 架构编译好的二进制代码。它启动时不需要同样程度的 JIT，但架构可移植性更低。

fatbin 可以包含多个架构版本的代码，例如多个 CUBIN 和 PTX fallback。

## 对比总结

| 对比项 | Runtime API | Driver API |
|---|---|---|
| 层级 | 高层 | 底层 |
| 易用性 | 更简单 | 更显式 |
| 初始化 | 多数隐式 | 显式 `cuInit` |
| context | 通常隐式 primary context | 显式管理 |
| kernel | `<<<grid, block>>>` | `cuLaunchKernel` |
| 适用 | 应用开发 | 框架、运行时、工具、底层基础设施 |
