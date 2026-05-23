---
title: "进程、线程与并发同步"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "操作系统"
  - "并发"
  - "同步"
---
# 进程、线程与并发同步

## 进程与线程

进程是操作系统进行资源分配和隔离的基本单位。线程是 CPU 调度执行的基本单位。

同一进程内线程共享：

- 虚拟地址空间。
- 代码段。
- 堆。
- 全局变量。
- 打开的文件描述符。
- 进程级资源。

每个线程私有：

- 栈。
- 寄存器状态。
- 程序计数器。
- 栈指针。
- 线程 ID。
- 线程局部存储 TLS。

线程切换通常比进程切换轻，因为同一进程内线程共享地址空间，通常不需要切换页表，TLB/cache 影响也更小。

## 进程间通信

常见 IPC 方式：

- pipe。
- named pipe。
- message queue。
- shared memory。
- socket。
- signal。
- mmap 文件映射。

高性能 IPC 常使用 shared memory，再配合同步机制保证并发安全。

## Race Condition

race condition 指多个执行实体并发访问共享状态，至少一个是写操作，最终结果依赖执行时序。

典型例子：

```cpp
int counter = 0;

void increment() {
    counter++;
}
```

`counter++` 通常包含：

```text
load
add
store
```

如果两个线程交错执行，可能产生 lost update。

## Data Race 与 Race Condition

`data race` 是 C++ 内存模型中的特定概念：多个线程并发访问同一内存位置，至少一个写，且没有 happens-before 同步关系。

`race condition` 是更广义的逻辑问题：程序结果依赖不期望的时序。它可以没有 data race，例如数据都被锁保护，但业务执行顺序仍然错误。

## Mutex 与 Atomic

`mutex` 适合保护复杂临界区，例如多个变量之间的不变量、容器操作、队列操作等。

```cpp
#include <mutex>

int counter = 0;
std::mutex m;

void increment() {
    std::lock_guard<std::mutex> lock(m);
    ++counter;
}
```

`atomic` 适合简单变量的原子读写或读改写。

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    ++counter;
}
```

## Deadlock

死锁是多个线程或进程互相等待对方持有的资源，导致都无法继续执行。

四个必要条件：

- mutual exclusion：互斥。
- hold and wait：持有并等待。
- no preemption：不可抢占。
- circular wait：循环等待。

只要破坏其中任意一个条件，就可以预防死锁。

## 固定加锁顺序

固定加锁顺序可以破坏 circular wait。

错误示例：

```cpp
std::mutex m1, m2;

void threadA() {
    std::lock_guard<std::mutex> lock1(m1);
    std::lock_guard<std::mutex> lock2(m2);
}

void threadB() {
    std::lock_guard<std::mutex> lock1(m2);
    std::lock_guard<std::mutex> lock2(m1);
}
```

可能出现：

```text
threadA 持有 m1，等待 m2
threadB 持有 m2，等待 m1
```

修正：

```cpp
void threadA() {
    std::lock_guard<std::mutex> lock1(m1);
    std::lock_guard<std::mutex> lock2(m2);
}

void threadB() {
    std::lock_guard<std::mutex> lock1(m1);
    std::lock_guard<std::mutex> lock2(m2);
}
```

或使用：

```cpp
void threadA() {
    std::scoped_lock lock(m1, m2);
}

void threadB() {
    std::scoped_lock lock(m1, m2);
}
```

## Livelock

deadlock 中线程阻塞等待资源。livelock 中线程仍在运行、重试或响应对方，但系统状态无法推进。
