---
title: "C++ 动态内存管理与 RAII"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "C++"
  - "系统编程"
  - "RAII"
  - "内存管理"
---
# C++ 动态内存管理与 RAII

## 栈与堆

栈内存通常由编译器和运行时自动管理，生命周期跟随函数调用和作用域。堆内存由程序显式申请和释放，生命周期更灵活，但也更容易产生资源泄漏、悬垂指针、重复释放和越界访问。

## `malloc/free` 与 `new/delete`

`malloc/free` 来自 C 标准库，只负责原始字节内存的分配和释放。

`new/delete` 是 C++ 的对象生命周期机制：

- `new` 分配内存并调用构造函数。
- `delete` 调用析构函数并释放内存。
- `new[]` 必须配 `delete[]`。
- `malloc` 必须配 `free`。

错误示例：

```cpp
int* p = new int[10];
delete p; // 错误，应使用 delete[]
```

正确写法：

```cpp
int* p = new int[10];
delete[] p;
```

混用分配和释放接口属于 undefined behavior：

```cpp
int* p = static_cast<int*>(malloc(sizeof(int)));
delete p; // 错误，应使用 free(p)
```

## 常见内存错误

### 悬垂指针

```cpp
int* f() {
    int x = 10;
    return &x;
}
```

`x` 是栈上的局部变量，函数返回后生命周期结束。返回它的地址会得到 dangling pointer，之后解引用属于 undefined behavior。

### double delete

```cpp
int* q = new int(5);
delete q;
delete q;
```

同一块堆内存被释放两次，会破坏堆管理状态，属于 undefined behavior。

释放后置空只能保护同一个指针变量：

```cpp
delete q;
q = nullptr;
delete q; // 安全，delete nullptr 无效果
```

但如果还有别名指针指向同一块内存，仍然危险。

### buffer overflow

```cpp
char buf[4];
buf[4] = 'A';
```

合法下标是 `0..3`，访问 `buf[4]` 越界。

## RAII

RAII 的全称是 Resource Acquisition Is Initialization。核心思想是把资源生命周期绑定到对象生命周期：

- 构造函数获取资源。
- 析构函数释放资源。
- 作用域退出、提前 `return` 或异常栈展开时，析构函数自动执行。

典型 RAII 类型：

- `std::unique_ptr` 管理独占堆对象。
- `std::shared_ptr` 管理共享所有权对象。
- `std::weak_ptr` 表示弱引用，不增加引用计数。
- `std::lock_guard` 管理互斥锁。
- `std::fstream` 管理文件句柄。

## 智能指针

### `unique_ptr`

`unique_ptr` 表示独占所有权，不能拷贝，但可以移动。禁止拷贝是为了避免多个 owner 管理同一资源导致 double delete。

```cpp
auto p = std::make_unique<int>(10);
auto q = std::move(p);
```

### `shared_ptr`

`shared_ptr` 使用引用计数共享所有权。缺点包括引用计数开销、所有权关系不够清晰、对象释放时机不如 `unique_ptr` 明确，以及循环引用风险。

### `weak_ptr`

`weak_ptr` 不增加引用计数，常用于打破 `shared_ptr` 循环引用。

## 用 RAII 改写裸指针代码

原始代码：

```cpp
void process() {
    int* data = new int[100];

    if (some_condition()) {
        return;
    }

    do_work(data);
    delete[] data;
}
```

问题：提前 `return` 或 `do_work` 抛异常会导致内存泄漏。

使用 `unique_ptr`：

```cpp
#include <memory>

void process() {
    auto data = std::make_unique<int[]>(100);

    if (some_condition()) {
        return;
    }

    do_work(data.get());
}
```

使用 `vector`：

```cpp
#include <vector>

void process() {
    std::vector<int> data(100);

    if (some_condition()) {
        return;
    }

    do_work(data.data());
}
```

如果需要保存长度并进行数组式管理，`std::vector` 通常比裸数组和 `unique_ptr<int[]>` 更方便。
