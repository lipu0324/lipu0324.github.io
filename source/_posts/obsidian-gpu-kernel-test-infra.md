---
title: "GPU Kernel 测试基础设施"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "GPU"
  - "CUDA"
  - "测试"
---
# GPU Kernel 测试基础设施

## 目标

GPU kernel 测试基础设施的目标是自动化、可复现地运行测试，收集日志和指标，判断结果正确性，并对失败进行分类和复现。

一个可靠的测试基础设施通常包括：

- 输入层。
- 执行层。
- 日志层。
- 分析层。
- 复现层。

## 输入层

输入层描述一次测试所需的场景、参数和环境。

测试用例定义：

- kernel 名称。
- grid/block 维度。
- 动态 shared memory 大小。
- stream 设置。
- 输入数据形状、数据类型和生成规则。
- 随机种子。
- 边界值或固定模式。
- 预期输出或参考实现。
- 浮点比较容差。
- 测试标签、优先级和超时时间。

配置与版本信息：

- CUDA Toolkit 版本。
- GPU driver 版本。
- 编译器版本。
- 操作系统。
- GPU 型号、显存、计算能力。
- git commit hash。
- 编译选项。
- 环境变量。
- 输入数据 hash。

## 执行层

执行层负责调度和运行测试。

常见步骤：

1. 扫描测试用例。
2. 根据硬件要求筛选设备。
3. 设置环境变量。
4. 编译或加载 kernel。
5. 生成输入数据。
6. 分配 device memory。
7. 拷贝输入到 device。
8. 启动 kernel。
9. 同步并检查 CUDA 错误。
10. 拷贝结果回 host。
11. 与参考实现比较。
12. 清理资源。

执行策略：

- correctness 测试可以在资源隔离后并发运行。
- performance 测试应尽量独占 GPU，避免资源干扰。
- debug 模式可使用 Compute Sanitizer。
- 每个测试应设置超时上限。

## 日志层

日志应尽量结构化，便于机器解析和自动聚合。

建议记录：

- 测试名称。
- 时间戳。
- 总耗时。
- pass/fail 状态。
- kernel launch 参数。
- 随机种子。
- 输入数据 hash。
- CUDA 错误码和错误描述。
- kernel 执行时间。
- 数据传输时间。
- GPU 型号和驱动版本。
- CUDA Toolkit 版本。
- 编译选项。
- 失败元素的 index、expected、actual 和 error。

可使用 JSON、Protobuf 或其他结构化格式保存机器可读日志，同时生成文本摘要供人工查看。

## 分析层

分析层负责判断 pass/fail，并对失败进行分类。

常见失败分类：

| 分类 | 典型条件 | 可能原因 |
|---|---|---|
| build failure | 编译返回非零 | 语法错误、架构不匹配 |
| runtime error | CUDA API 返回错误 | 非法参数、内存不足、无效指针 |
| numerical mismatch | 输出超过容差 | 算法错误、浮点误差、同步缺失 |
| memory error | Compute Sanitizer 报告 | 越界访问、未初始化读写 |
| timeout | 超过时间限制 | 死循环、过大 workload |
| environment issue | 环境不满足 | 驱动过旧、GPU 型号不匹配 |
| flaky failure | 同配置多次运行结果不稳定 | 竞态、未初始化数据、外部干扰 |
| performance regression | 性能低于基线 | 访存模式变差、occupancy 下降 |

## 复现层

复现层的目标是让其他人可以在相同或明确记录的环境中重新运行失败。

需要保存：

- 复现命令。
- test id。
- git commit hash。
- 随机种子。
- 输入数据 hash。
- CUDA Toolkit 版本。
- host driver 版本。
- GPU 型号。
- 编译选项。
- 环境变量。

示例：

```bash
./run_test --test-id vector_add_boundary --seed 12345 --gpu 0 --sanitize
```

Docker 可以固定用户态依赖和工具链，但 GPU driver 和硬件仍依赖 host，因此需要额外记录 host driver 和 GPU 型号。

## Flaky Test

flaky test 指在相同代码、配置和输入下，测试结果有时通过、有时失败。

定位方法：

1. 固定随机种子。
2. 固定输入数据并记录 hash。
3. 记录完整环境。
4. 多次重复运行，统计失败率。
5. 检查是否与资源竞争、并发时序、未初始化内存、异步错误或外部依赖有关。
6. 使用 Compute Sanitizer、日志、trace 和最小复现定位。

retry 可以作为短期缓解，但不能掩盖根因。应记录 flaky rate，并将不稳定测试隔离或降级处理，直到根因被修复。
