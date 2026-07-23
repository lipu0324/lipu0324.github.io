---
title: "自动求导、前向传播、反向传播与计算图入门"
date: "2026-07-14 14:52:54"
updated: "2026-07-14 15:40:57"
obsidian: true
categories:
  - "技能学习"
tags:
  - "自动求导"
  - "PyTorch"
  - "分布式训练"
  - "Horovod"
---

> 面向完全没有自动求导基础的初学者，从导数、梯度和链式法则开始，逐步理解神经网络训练、计算图、PyTorch 自动求导，以及 Horovod AllReduce 为什么在反向传播中还需要通信。

## 学习目标

学完本文后，你应该能够回答以下问题：

1. 模型训练时，前向传播、反向传播和参数更新分别负责什么？
2. 导数、偏导数和梯度有什么区别？
3. 计算图记录了什么信息，为什么自动求导离不开计算图？
4. 链式法则如何让梯度从损失函数传播到模型参数？
5. PyTorch 中 `requires_grad`、`grad_fn`、`.grad` 和 `backward()` 分别是什么？
6. 自定义 `torch.autograd.Function` 中的 `forward()`、`backward()` 和 `grad_output` 是什么？
7. 为什么一个 AllReduce 算子的反向传播通常还需要执行一次 AllReduce？

## 目录

- [1. 机器学习训练到底在做什么](#1-机器学习训练到底在做什么)
- [2. 导数、偏导数和梯度](#2-导数偏导数和梯度)
- [3. 前向传播](#3-前向传播)
- [4. 计算图](#4-计算图)
- [5. 链式法则](#5-链式法则)
- [6. 反向传播](#6-反向传播)
- [7. 参数更新与优化器](#7-参数更新与优化器)
- [8. 自动求导](#8-自动求导)
- [9. PyTorch 如何构建计算图](#9-pytorch-如何构建计算图)
- [10. grad_output 与向量-Jacobian 乘积](#10-grad_output-与向量-jacobian-乘积)
- [11. 自定义自动求导算子](#11-自定义自动求导算子)
- [12. 分支、梯度累积与图的生命周期](#12-分支梯度累积与图的生命周期)
- [13. detach、no_grad、训练模式和原地操作](#13-detachno_grad训练模式和原地操作)
- [14. 分布式数据并行中的梯度同步](#14-分布式数据并行中的梯度同步)
- [15. Horovod AllReduce 的自动求导](#15-horovod-allreduce-的自动求导)
- [16. 压缩在计算图中的位置](#16-压缩在计算图中的位置)
- [17. 常见误区](#17-常见误区)
- [18. 动手练习](#18-动手练习)

---

## 1. 机器学习训练到底在做什么

先从一个只有两个参数的模型开始。

假设输入和正确答案分别是：

```text
输入 x = 2
目标 t = 10
```

模型的计算公式为：

```text
y = w × x + b
```

其中：

- `x`：输入数据。
- `w`：权重，是模型需要学习的参数。
- `b`：偏置，也是模型需要学习的参数。
- `y`：模型预测值。
- `t`：正确答案或训练目标。

假设模型最开始的参数是：

```text
w = 3
b = 1
```

模型预测值为：

```text
y = 3 × 2 + 1 = 7
```

预测值 7 与正确答案 10 不一致，因此需要使用损失函数衡量误差。这里采用平方损失：

```text
L = (y - t)²
```

代入当前结果：

```text
L = (7 - 10)² = 9
```

模型训练的目标就是不断调整 `w` 和 `b`，让损失 `L` 越来越小。

一次典型训练迭代包含三个阶段：

```text
前向传播：根据当前参数计算预测值和损失
    ↓
反向传播：计算损失对每个参数的梯度
    ↓
参数更新：优化器根据梯度修改参数
```

需要特别注意：

> 反向传播只负责计算梯度，不负责修改模型参数。真正更新参数的是优化器。

---

## 2. 导数、偏导数和梯度

### 2.1 导数表示变化率

考虑函数：

```text
y = x²
```

当 `x=2` 时：

```text
y = 4
```

如果把 `x` 从 2 稍微增加到 2.01：

```text
y = 2.01² = 4.0401
```

`x` 增加约 0.01，`y` 增加约 0.04。这说明在 `x=2` 附近，`x` 每增加 1，`y` 大约增加 4。

这个变化率就是导数：

```text
dy/dx = 2x
```

当 `x=2` 时：

```text
dy/dx = 4
```

可以把导数理解为函数曲线在某一点的斜率：

- 导数为正：增大输入通常会使输出增大。
- 导数为负：增大输入通常会使输出减小。
- 导数绝对值很大：输出对输入非常敏感。
- 导数接近 0：输出对输入变化不敏感。

### 2.2 偏导数

真实模型通常有很多参数。例如损失同时依赖 `w` 和 `b`：

```text
L = f(w, b)
```

我们分别计算：

```text
∂L/∂w
∂L/∂b
```

它们叫偏导数：

- `∂L/∂w`：只改变 `w` 时，损失如何变化。
- `∂L/∂b`：只改变 `b` 时，损失如何变化。

### 2.3 梯度

把所有参数的偏导数组织在一起，就是梯度：

```text
∇L = [∂L/∂w, ∂L/∂b]
```

梯度指出损失增长最快的方向。为了减小损失，参数通常沿梯度的反方向移动：

```text
参数新值 = 参数旧值 - 学习率 × 梯度
```

即：

```text
w_new = w - learning_rate × ∂L/∂w
b_new = b - learning_rate × ∂L/∂b
```

这就是最基本的梯度下降。

---

## 3. 前向传播

前向传播是指：

> 从输入开始，按照模型定义的运算顺序，一步步计算出预测值和损失。

仍使用：

```text
y = wx + b
L = (y - t)²
```

将它拆成几个基本运算：

```text
u = w × x
v = u + b
e = v - t
L = e²
```

当：

```text
x = 2
w = 3
b = 1
t = 10
```

前向传播结果为：

```text
u = 3 × 2 = 6
v = 6 + 1 = 7
e = 7 - 10 = -3
L = (-3)² = 9
```

这就是一次完整的前向传播。

神经网络虽然规模更大，但本质上仍是大量基本运算的组合，例如：

- 矩阵乘法
- 加法
- 卷积
- 激活函数
- 归一化
- 注意力计算
- 损失函数

---

## 4. 计算图

计算图是对计算过程和数据依赖关系的结构化表示。

前面的计算：

```text
u = w × x
v = u + b
e = v - t
L = e²
```

可以画成：

```text
w ──┐
    ├── Multiply ── u ──┐
x ──┘                   ├── Add ── v ──┐
b ──────────────────────┘              ├── Subtract ── e ── Square ── L
t ─────────────────────────────────────┘
```

计算图中可以抽象出两类对象：

- Tensor 或变量：例如 `w、x、u、v、e、L`。
- Operation：例如乘法、加法、减法和平方。

边表示依赖关系：

```text
u 依赖 w 和 x
v 依赖 u 和 b
e 依赖 v 和 t
L 依赖 e
```

### 4.1 计算图的作用

计算图至少有三个重要作用。

第一，确定计算顺序：

```text
必须先算 u，才能算 v
必须先算 v，才能算 e
必须先算 e，才能算 L
```

第二，记录依赖关系：

```text
如果 L 发生变化，需要知道它依赖哪些中间结果和参数
```

第三，支持自动求导：

```text
从 L 出发沿计算图反向遍历，可以计算 L 对 w、b、x 的梯度
```

### 4.2 动态计算图与静态计算图

PyTorch 默认使用动态计算图：Python 程序实际运行到哪一步，计算图就构建到哪一步。

例如：

```python
if x.sum() > 0:
    y = x * 2
else:
    y = x * 3
```

这次实际走了哪个分支，PyTorch 就记录哪个分支。

传统 TensorFlow 1.x 更偏向先定义静态图，再统一执行。现代 TensorFlow Eager 模式更接近动态执行，而 `tf.function` 会将 Python 计算追踪或编译成图。

---

## 5. 链式法则

反向传播的数学基础是链式法则。

假设：

```text
y = f(u)
u = g(x)
```

因为 `y` 通过 `u` 间接依赖 `x`，所以：

```text
dy/dx = dy/du × du/dx
```

例如：

```text
u = 3x
y = u²
```

局部导数为：

```text
dy/du = 2u
du/dx = 3
```

所以：

```text
dy/dx = 2u × 3
```

当 `x=2` 时：

```text
u = 6
dy/dx = 2 × 6 × 3 = 36
```

如果直接展开：

```text
y = (3x)² = 9x²
dy/dx = 18x
```

当 `x=2` 时仍然得到：

```text
dy/dx = 36
```

无论神经网络有多少层，链式法则仍然成立。反向传播就是高效地在计算图上反复应用链式法则。

---

## 6. 反向传播

反向传播是指：

> 从最终损失出发，沿计算图反向移动，利用链式法则计算每个中间变量和模型参数的梯度。

继续使用：

```text
u = wx
v = u + b
e = v - t
L = e²
```

前向结果为：

```text
x = 2
w = 3
b = 1
t = 10

u = 6
v = 7
e = -3
L = 9
```

### 6.1 从损失自身开始

任何变量对自己的导数都是 1：

```text
∂L/∂L = 1
```

这是反向传播的起点。

### 6.2 通过平方运算

```text
L = e²
```

局部导数：

```text
∂L/∂e = 2e
```

因为 `e=-3`：

```text
∂L/∂e = -6
```

### 6.3 通过减法运算

```text
e = v - t
```

局部导数：

```text
∂e/∂v = 1
∂e/∂t = -1
```

所以：

```text
∂L/∂v = ∂L/∂e × ∂e/∂v
       = -6 × 1
       = -6
```

目标值 `t` 通常不是模型参数，因此一般不需要保存它的梯度。

### 6.4 通过加法运算

```text
v = u + b
```

局部导数：

```text
∂v/∂u = 1
∂v/∂b = 1
```

所以：

```text
∂L/∂u = -6
∂L/∂b = -6
```

### 6.5 通过乘法运算

```text
u = wx
```

局部导数：

```text
∂u/∂w = x
∂u/∂x = w
```

所以：

```text
∂L/∂w = ∂L/∂u × ∂u/∂w
       = -6 × 2
       = -12
```

以及：

```text
∂L/∂x = ∂L/∂u × ∂u/∂x
       = -6 × 3
       = -18
```

最终得到模型参数梯度：

```text
∂L/∂w = -12
∂L/∂b = -6
```

负梯度表示增大 `w` 和 `b` 会让损失下降。这符合直觉，因为当前预测值 7 小于目标值 10，需要增大模型输出。

---

## 7. 参数更新与优化器

假设学习率为：

```text
learning_rate = 0.1
```

使用最基本的梯度下降更新：

```text
w_new = 3 - 0.1 × (-12) = 4.2
b_new = 1 - 0.1 × (-6)  = 1.6
```

这一步由优化器完成，而不是由反向传播完成。

典型 PyTorch 训练代码为：

```python
optimizer.zero_grad()
output = model(input)
loss = loss_fn(output, target)
loss.backward()
optimizer.step()
```

各行职责如下：

```python
optimizer.zero_grad()
```

清空上一次迭代留下的梯度。

```python
output = model(input)
loss = loss_fn(output, target)
```

执行前向传播并计算损失。

```python
loss.backward()
```

执行反向传播，将梯度写入模型参数的 `.grad`。

```python
optimizer.step()
```

根据参数的 `.grad` 更新参数。

---

## 8. 自动求导

自动求导可以理解为：

> 框架在前向计算时记录每一个运算，然后在反向传播时自动应用各运算的求导规则和链式法则。

### 8.1 自动求导不是数值求导

数值求导通过扰动输入估算：

```text
df/dx ≈ [f(x+ε) - f(x)] / ε
```

它的缺点包括：

- 结果只是近似值。
- 容易受到浮点误差影响。
- 每个参数都可能需要额外执行模型。
- 对数十亿参数的模型不可行。

### 8.2 自动求导不是传统符号求导

符号求导试图生成完整的导数表达式，例如：

```text
f(x) = x² + 3x
f'(x) = 2x + 3
```

复杂神经网络的符号表达式可能快速膨胀。

### 8.3 自动求导如何工作

自动求导把复杂模型拆成框架已知求导规则的基本运算：

| 运算 | 局部导数 |
|---|---|
| `z=x+y` | `∂z/∂x=1`，`∂z/∂y=1` |
| `z=xy` | `∂z/∂x=y`，`∂z/∂y=x` |
| `z=x²` | `∂z/∂x=2x` |
| `z=sin(x)` | `∂z/∂x=cos(x)` |
| `z=exp(x)` | `∂z/∂x=exp(x)` |
| `z=ReLU(x)` | `x>0` 时为 1，否则为 0 |

框架只需要知道每个基本运算的局部求导规则，就能通过计算图和链式法则组合出整个模型的梯度。

### 8.4 为什么训练需要保存前向中间结果

考虑：

```text
z = xy
```

反向需要：

```text
∂z/∂x = y
∂z/∂y = x
```

所以反向传播需要知道前向阶段的 `x` 和 `y`。

再如：

```text
y = ReLU(x)
```

反向需要知道前向时哪些位置满足 `x>0`。

因此训练时框架经常需要保存：

- 输入和输出 Tensor
- 激活值
- 掩码
- Tensor 形状
- 运算属性

这也是训练比推理更占显存的重要原因。Gradient Checkpointing 则通过反向时重新执行部分前向运算，用更多计算换取更少显存。

---

## 9. PyTorch 如何构建计算图

下面用 PyTorch 实现前面的例子：

```python
import torch

x = torch.tensor(2.0)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)
t = torch.tensor(10.0)

u = w * x
v = u + b
e = v - t
loss = e ** 2
```

执行这些 Python 语句时，PyTorch 一边计算数值，一边构建动态计算图：

```text
w ──┐
    ├── MulBackward ── u ──┐
x ──┘                      ├── AddBackward ── v ──┐
b ─────────────────────────┘                     ├── SubBackward ── e ── PowBackward ── loss
t ───────────────────────────────────────────────┘
```

### 9.1 `requires_grad`

```python
w = torch.tensor(3.0, requires_grad=True)
```

表示需要跟踪与 `w` 相关的计算，以便最终计算梯度。

模型参数通常都设置为：

```text
requires_grad=True
```

### 9.2 叶子 Tensor

用户直接创建且需要求导的 Tensor 通常是叶子 Tensor：

```python
print(w.is_leaf)   # True
print(w.grad_fn)   # None
```

模型参数通常是叶子 Tensor。反向传播后，它们的梯度会保存在：

```python
w.grad
b.grad
```

### 9.3 非叶子 Tensor 与 `grad_fn`

运算生成的 Tensor 通常不是叶子：

```python
u = w * x

print(u.is_leaf)   # False
print(u.grad_fn)   # MulBackward...
```

`grad_fn` 表示产生当前 Tensor 的反向运算节点。

非叶子 Tensor 默认不会长期保存 `.grad`，因为保存所有中间梯度会占用大量内存。如需观察：

```python
u.retain_grad()
```

### 9.4 `loss.backward()`

执行：

```python
loss.backward()
```

PyTorch 大致会：

1. 将 `∂loss/∂loss` 初始化为 1。
2. 找到 `loss.grad_fn`。
3. 按计算图的逆拓扑顺序遍历。
4. 调用每个节点的 backward 规则。
5. 将梯度传播到节点的输入。
6. 将不同路径到达同一 Tensor 的梯度相加。
7. 将最终梯度写入叶子参数的 `.grad`。

验证：

```python
loss.backward()

print(w.grad)  # tensor(-12.)
print(b.grad)  # tensor(-6.)
```

---

## 10. grad_output 与向量-Jacobian 乘积

### 10.1 上游梯度

考虑一个中间运算：

```text
y = x²
L = 3y
```

平方节点只知道自己的局部导数：

```text
dy/dx = 2x
```

但最终需要计算：

```text
dL/dx
```

根据链式法则：

```text
dL/dx = dL/dy × dy/dx
```

其中 `dL/dy` 是从计算图后面传来的上游梯度，在 PyTorch 自定义 backward 中对应：

```python
grad_output
```

因此平方算子的 backward 应返回：

```python
grad_input = grad_output * 2 * x
```

不能只返回 `2*x`，因为这个算子可能位于复杂计算图中间。

### 10.2 为什么标量损失可以直接 backward

如果 `loss` 是标量，可以直接：

```python
loss.backward()
```

因为框架默认使用：

```text
dloss/dloss = 1
```

### 10.3 向量输出为什么需要传入梯度

如果输出是向量：

```python
y = torch.tensor([y1, y2, y3], requires_grad=True)
```

直接调用：

```python
y.backward()
```

PyTorch 不知道你希望对哪个标量目标求导。

可以传入：

```python
y.backward(torch.ones_like(y))
```

相当于定义：

```text
L = y1 + y2 + y3
```

传入的 Tensor 就是 `grad_output`。

### 10.4 Jacobian

如果输入和输出都是向量：

```text
x ∈ Rⁿ
y ∈ Rᵐ
```

完整导数是 Jacobian 矩阵：

```text
        [∂y₁/∂x₁  ...  ∂y₁/∂xₙ]
J =     [   ...          ...    ]
        [∂yₘ/∂x₁  ...  ∂yₘ/∂xₙ]
```

神经网络可能有数十亿参数，显式构造完整 Jacobian 非常昂贵。

反向传播通常直接计算：

```text
Jᵀv
```

其中 `v` 就是上游梯度。这个过程称为向量-Jacobian 乘积，即 VJP。

反向模式自动求导非常适合神经网络，因为神经网络通常具有：

```text
大量参数 → 一个标量损失
```

从一个标量损失出发，一次反向遍历就能得到所有参数的梯度。

---

## 11. 自定义自动求导算子

最简单的自定义平方算子如下：

```python
import torch


class Square(torch.autograd.Function):

    @staticmethod
    def forward(ctx, x):
        ctx.save_for_backward(x)
        return x * x

    @staticmethod
    def backward(ctx, grad_output):
        x, = ctx.saved_tensors
        return grad_output * 2 * x
```

调用自定义 `Function` 时使用 `.apply()`：

```python
x = torch.tensor(3.0, requires_grad=True)

y = Square.apply(x)
loss = 5 * y

loss.backward()
print(x.grad)
```

前向计算：

```text
y = 3² = 9
loss = 5 × 9 = 45
```

反向计算：

```text
dloss/dy = 5
dy/dx = 2x = 6
dloss/dx = 5 × 6 = 30
```

所以输出：

```text
tensor(30.)
```

### 11.1 `ctx` 的作用

`ctx` 是 PyTorch 自动创建的自动求导上下文，用来把前向阶段的信息传递给反向阶段。

保存 Tensor 时推荐：

```python
ctx.save_for_backward(x)
```

保存普通配置时可以：

```python
ctx.some_option = some_option
```

### 11.2 backward 的返回值数量

`backward()` 必须针对 `forward()` 中除 `ctx` 之外的每个输入返回一个梯度。

例如：

```python
def forward(ctx, tensor, name, factor):
    ...
```

那么 backward 应返回三个位置：

```python
return grad_tensor, None, None
```

字符串和普通配置不参与求导，所以返回 `None`。

---

## 12. 分支、梯度累积与图的生命周期

### 12.1 分支路径的梯度需要相加

考虑：

```text
a = x²
b = 3x
L = a + b
```

计算图：

```text
     ┌── Square ── a ──┐
x ───┤                 ├── Add ── L
     └── Multiply ─ b ─┘
```

`x` 通过两条路径影响 `L`，因此：

```text
dL/dx = dL/da × da/dx + dL/db × db/dx
      = 2x + 3
```

当 `x=2`：

```text
dL/dx = 7
```

这也是自动求导系统需要累加梯度的根本原因。

### 12.2 PyTorch 的 `.grad` 默认累积

连续执行多次 backward 时，叶子 Tensor 的 `.grad` 通常会继续累加，而不是自动覆盖。

因此训练时每轮一般先执行：

```python
optimizer.zero_grad()
```

梯度累积也可以被主动利用，例如希望模拟更大的 batch 时，可以连续处理多个小 batch 后再执行一次 `optimizer.step()`。

### 12.3 计算图默认反向一次后释放

执行：

```python
loss.backward()
```

之后，PyTorch 通常会释放部分计算图和前向中间值，以节约内存。

如果确实需要对同一图重复反向：

```python
loss.backward(retain_graph=True)
```

但这会增加显存占用。

如果希望梯度计算本身也被记录，用于二阶导数：

```python
loss.backward(create_graph=True)
```

普通训练通常不需要这两个选项。

---

## 13. detach、no_grad、训练模式和原地操作

### 13.1 `detach()`

```python
y_detached = y.detach()
```

它会得到一个不再连接原自动求导图的 Tensor。后续基于 `y_detached` 的计算不会把梯度传播回原来的 `y`。

概念上可以理解为：

```text
原计算图 ── y    y_detached 从这里切断求导关系
```

### 13.2 `torch.no_grad()`

```python
with torch.no_grad():
    output = model(input)
```

这段代码不会记录自动求导图，常用于推理或手动修改模型参数。

### 13.3 `torch.inference_mode()`

`inference_mode()` 比 `no_grad()` 更彻底地关闭部分自动求导相关状态，适合纯推理场景。

### 13.4 `model.train()` 与 `model.eval()`

```python
model.train()
model.eval()
```

它们主要影响以下层的行为：

- Dropout
- BatchNorm

它们并不控制是否记录梯度。

典型推理代码应同时写成：

```python
model.eval()

with torch.no_grad():
    output = model(input)
```

### 13.5 原地操作

原地操作会直接修改 Tensor 数据，例如：

```python
x.add_(1)
x *= 2
```

但反向传播可能需要前向时的旧值。例如：

```text
y = x²
dy/dx = 2x
```

如果前向后把 `x` 原地改掉，反向就可能无法计算正确梯度。

PyTorch 会使用版本计数器检测这种情况，并可能报告：

```text
one of the variables needed for gradient computation
has been modified by an inplace operation
```

因此，对参与自动求导的 Tensor 使用原地操作时需要格外谨慎。

---

## 14. 分布式数据并行中的梯度同步

假设有两个进程，每个进程使用一张设备卡，并持有相同的模型参数：

```text
rank 0: 参数 w，处理 batch A
rank 1: 参数 w，处理 batch B
```

每个 rank 独立执行前向和反向：

```text
rank 0 得到局部梯度 g₀
rank 1 得到局部梯度 g₁
```

如果各 rank 直接使用自己的局部梯度更新参数：

```text
rank 0: w ← w - lr × g₀
rank 1: w ← w - lr × g₁
```

两个模型参数会变得不同。

因此，在更新前需要聚合梯度：

```text
g = (g₀ + g₁) / 2
```

然后两个进程都使用相同梯度更新：

```text
rank 0: w ← w - lr × g
rank 1: w ← w - lr × g
```

这就是数据并行训练中 AllReduce 最常见的用途。

如果有 `N` 个进程，每个进程的局部损失为 `Lᵣ`，全局平均损失为：

```text
L_global = (L₀ + L₁ + ... + Lₙ₋₁) / N
```

那么：

```text
∇L_global = (∇L₀ + ∇L₁ + ... + ∇Lₙ₋₁) / N
```

所以对各 rank 的局部梯度执行 Average AllReduce，正好得到全局平均梯度。

---

## 15. Horovod AllReduce 的自动求导

考虑下面这个简化的 Horovod 自定义自动求导算子：

```python
class HorovodAllreduce(torch.autograd.Function):
    """An autograd function that performs allreduce on a tensor."""

    @staticmethod
    def forward(ctx, tensor, average, name, op,
                prescale_factor, postscale_factor, process_set):
        ctx.average = average
        ctx.op = op
        ctx.prescale_factor = prescale_factor
        ctx.postscale_factor = postscale_factor
        ctx.process_set = process_set

        handle = allreduce_async(
            tensor, average, name, op,
            prescale_factor, postscale_factor, process_set
        )
        return synchronize(handle)

    @staticmethod
    def backward(ctx, grad_output):
        return allreduce(
            grad_output,
            average=ctx.average,
            op=ctx.op,
            prescale_factor=ctx.prescale_factor,
            postscale_factor=ctx.postscale_factor,
            process_set=ctx.process_set
        ), None, None, None, None, None, None
```

### 15.1 forward 做了什么

前向阶段首先保存反向传播需要的通信配置：

```python
ctx.average = average
ctx.op = op
ctx.prescale_factor = prescale_factor
ctx.postscale_factor = postscale_factor
ctx.process_set = process_set
```

随后启动异步 AllReduce：

```python
handle = allreduce_async(...)
```

异步接口返回的是通信句柄，而不是最终结果。`synchronize(handle)` 会等待通信完成并返回输出 Tensor：

```python
return synchronize(handle)
```

因此这个公开前向调用在返回结果前仍会等待通信完成，但底层可以复用 Horovod 的异步队列、设备 stream 和句柄管理机制。

### 15.2 为什么 backward 还需要一次 AllReduce

假设两个 rank 执行 Sum AllReduce：

```text
x₀ ──┐
      ├── AllReduce Sum ── y₀ ── L₀
x₁ ──┘                └── y₁ ── L₁
```

前向结果：

```text
y₀ = x₀ + x₁
y₁ = x₀ + x₁
```

定义各 rank 的上游梯度：

```text
g₀ = ∂L₀/∂y₀
g₁ = ∂L₁/∂y₁
```

由于每个输出都依赖每个输入，对 `x₀` 有：

```text
∂L/∂x₀
= ∂L₀/∂y₀ × ∂y₀/∂x₀
+ ∂L₁/∂y₁ × ∂y₁/∂x₀
= g₀ + g₁
```

同理：

```text
∂L/∂x₁ = g₀ + g₁
```

所以 Sum AllReduce 的反向传播仍是一次 Sum AllReduce：

```python
allreduce(grad_output, op=Sum)
```

如果前向是 Average：

```text
y₀ = y₁ = (x₀+x₁)/2
```

那么：

```text
∂L/∂x₀ = (g₀+g₁)/2
∂L/∂x₁ = (g₀+g₁)/2
```

对应一次 Average AllReduce。

因此，AllReduce backward 再做一次通信不仅是为了“让梯度一致”，也是这个跨 rank 数学算子的反向求导规则。

### 15.3 backward 为什么返回多个 `None`

`forward()` 除 `ctx` 外有七个输入：

```text
1. tensor
2. average
3. name
4. op
5. prescale_factor
6. postscale_factor
7. process_set
```

所以 backward 必须返回七个对应位置：

```python
return tensor_gradient, None, None, None, None, None, None
```

只有 `tensor` 需要梯度。其余参数是布尔值、字符串、操作类型、普通数值配置或 Process Set，不作为可训练 Tensor 求导。

### 15.4 缩放因子的梯度语义

前向操作可以写成：

```text
y = postscale × Reduce(prescale × x)
```

对于 Sum 和 Average 这类线性 Reduce，输入梯度中也包含：

```text
prescale × postscale
```

因此 backward 继续传入相同的 `prescale_factor` 和 `postscale_factor`。

### 15.5 Process Set

默认的 `global_process_set` 表示所有 Horovod rank 都参与通信。

也可以创建子集合，例如：

```text
Process Set A = [0, 2]
Process Set B = [1, 3]
```

指定 Process Set 后，只在集合内执行 AllReduce。

参与同一集合通信的 rank 需要保证：

- 都调用对应通信。
- Tensor 类型一致。
- Tensor 形状一致。
- 名称或调用顺序能够匹配。

否则可能出现等待、stall 或形状检查错误。

### 15.6 Min、Max 和 Product 的梯度需要谨慎

Sum 和 Average 是线性运算，反向再次执行相同 Reduce 很自然。

但 Max 的数学梯度取决于最大值来自哪个 rank：

```text
x₀ = 3
x₁ = 5
y = max(x₀, x₁) = 5

∂y/∂x₀ = 0
∂y/∂x₁ = 1
```

Product 的梯度也依赖其他输入：

```text
y = x₀x₁
∂y/∂x₀ = x₁
∂y/∂x₁ = x₀
```

如果自定义 backward 没有保存前向输入、极值位置或掩码，只是简单复用同一 reduction，就不能自然认为它具有完整的 Min、Max、Product 自动求导语义。

常规数据并行训练主要使用 Average 或 Sum。

---

## 16. 压缩在计算图中的位置

Horovod 的公开 `allreduce()` 还会在通信前后执行压缩和解压：

```python
tensor_compressed, compression_ctx = compression.compress(tensor)

summed_tensor_compressed = HorovodAllreduce.apply(
    tensor_compressed,
    average,
    name,
    op,
    prescale_factor,
    postscale_factor,
    process_set
)

result = compression.decompress(
    summed_tensor_compressed,
    compression_ctx
)
```

计算图可以理解为：

```text
tensor
   │
   ▼
Compress
   │
   ▼
AllReduce
   │
   ▼
Decompress
   │
   ▼
result
```

反向传播按照相反顺序执行：

```text
result gradient
   │
   ▼
Decompress backward
   │
   ▼
AllReduce backward
   │
   ▼
Compress backward
   │
   ▼
tensor gradient
```

如果压缩方式是将 `float32` 转成 `float16` 通信，通信量会降低，但也可能带来精度损失。

这里的 `compression_ctx` 与自定义 `Function.forward(ctx, ...)` 中的自动求导 `ctx` 不是同一个对象：

- 自动求导 `ctx`：在 forward 和 backward 之间传递信息。
- `compression_ctx`：在 compress 和 decompress 之间传递压缩信息。

---

## 17. 常见误区

### 误区一：反向传播会修改参数

错误。`loss.backward()` 只计算并累积梯度，`optimizer.step()` 才更新参数。

### 误区二：梯度就是损失值

错误。损失表示模型当前有多差，梯度表示参数稍微变化时损失会如何变化。

### 误区三：计算图只是可视化工具

错误。计算图记录数据依赖和反向运算，是自动求导系统的基础结构。

### 误区四：每个 Tensor 的梯度只来自一条路径

错误。一个 Tensor 被多个后续操作使用时，所有路径产生的梯度需要相加。

### 误区五：每次 backward 会覆盖旧梯度

错误。PyTorch 默认将梯度累积到 `.grad` 中，因此训练迭代前通常需要清空梯度。

### 误区六：`model.eval()` 会关闭自动求导

错误。它只改变 Dropout、BatchNorm 等层的行为。关闭求导需要 `no_grad()` 或 `inference_mode()`。

### 误区七：异步 AllReduce 返回后结果立即可用

错误。异步接口先返回 handle，通常需要 `synchronize(handle)` 后才能安全使用结果。

### 误区八：自动求导就是数值差分

错误。自动求导通过基本运算的精确局部导数和链式法则计算梯度，不需要逐个扰动模型参数。

---

## 18. 动手练习

### 练习一：验证基础梯度

```python
import torch

x = torch.tensor(2.0)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)
t = torch.tensor(10.0)

y = w * x + b
loss = (y - t) ** 2

loss.backward()

print("y =", y)
print("loss =", loss)
print("w.grad =", w.grad)
print("b.grad =", b.grad)
```

期望：

```text
y = 7
loss = 9
w.grad = -12
b.grad = -6
```

### 练习二：观察计算图属性

```python
print(w.is_leaf)
print(w.grad_fn)

print(y.is_leaf)
print(y.grad_fn)

print(loss.grad_fn)
```

思考为什么参数 `w` 是叶子，而 `y` 和 `loss` 不是。

### 练习三：验证分支梯度累加

```python
x = torch.tensor(2.0, requires_grad=True)
loss = x ** 2 + 3 * x
loss.backward()

print(x.grad)
```

手算：

```text
dloss/dx = 2x + 3 = 7
```

### 练习四：观察 `.grad` 累积

```python
x = torch.tensor(2.0, requires_grad=True)

loss1 = x ** 2
loss1.backward()
print(x.grad)

loss2 = 3 * x
loss2.backward()
print(x.grad)
```

观察第二次 backward 后梯度为什么是两次结果之和。

### 练习五：实现自定义平方函数

实现本文中的 `Square`，然后运行：

```python
x = torch.tensor(3.0, requires_grad=True)
y = Square.apply(x)
loss = 5 * y
loss.backward()

print(x.grad)
```

思考 `grad_output` 为什么是 5，而不是 1。

### 练习六：向量输出的 backward

```python
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = x ** 2

y.backward(torch.tensor([1.0, 10.0, 100.0]))
print(x.grad)
```

根据：

```text
grad_input = grad_output × 2x
```

先手算，再与程序结果比较。

---

## 总结

把全文压缩成一条主线：

```text
前向传播
按照计算图从输入计算到预测和损失
    ↓
反向传播
从损失出发，沿计算图反向应用链式法则
    ↓
自动求导
负责记录运算、组织依赖并自动计算梯度
    ↓
优化器
使用梯度真正更新模型参数
```

在分布式训练中，计算图可能包含跨进程集合通信节点。AllReduce 的输出依赖多个 rank 的输入，因此它的反向传播也需要跨 rank 聚合上游梯度。

最终需要牢牢记住：

> 前向传播负责算结果，反向传播负责算梯度，优化器负责改参数；计算图连接了这三个过程，而自动求导是在计算图上高效应用链式法则。

## 参考资料

- [PyTorch：Autograd mechanics](https://docs.pytorch.org/docs/stable/notes/autograd.html)
- [Horovod 开源仓库](https://github.com/horovod/horovod)
