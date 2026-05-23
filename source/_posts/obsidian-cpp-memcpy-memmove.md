---
title: "memcpy 与 memmove"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "C++"
  - "系统编程"
  - "内存管理"
---
# `memcpy` 与 `memmove`

## 核心区别

`memcpy` 和 `memmove` 都用于按字节拷贝内存。

区别在于是否处理重叠内存：

- `memcpy` 要求源区间和目标区间不重叠，重叠时行为未定义。
- `memmove` 保证即使源区间和目标区间重叠也能得到正确结果。

## 为什么使用 `unsigned char*`

`void*` 只能表示通用地址，不能直接解引用，也不能做标准指针算术。内存拷贝需要按字节访问对象表示，因此通常把指针转换成 `unsigned char*`。

```cpp
unsigned char* d = static_cast<unsigned char*>(dest);
const unsigned char* s = static_cast<const unsigned char*>(src);
```

## `memcpy` 实现

```cpp
#include <cstddef>

void* my_memcpy(void* dest, const void* src, size_t n) {
    if (dest == nullptr || src == nullptr) {
        return nullptr;
    }

    unsigned char* d = static_cast<unsigned char*>(dest);
    const unsigned char* s = static_cast<const unsigned char*>(src);

    for (size_t i = 0; i < n; ++i) {
        d[i] = s[i];
    }

    return dest;
}
```

复杂度：

```text
Time: O(n)
Space: O(1)
```

## `memmove` 的方向选择

设源区间为 `[s, s + n)`，目标区间为 `[d, d + n)`。

如果目标地址位于源区间内部：

```text
s < d < s + n
```

从前往后拷贝会覆盖尚未读取的源数据，因此应从后往前拷贝。

其他情况可以从前往后拷贝：

```text
d < s
d >= s + n
```

## `memmove` 实现

```cpp
#include <cstddef>

void* my_memmove(void* dest, const void* src, size_t n) {
    if (dest == nullptr || src == nullptr) {
        return nullptr;
    }

    unsigned char* d = static_cast<unsigned char*>(dest);
    const unsigned char* s = static_cast<const unsigned char*>(src);

    if (d == s || n == 0) {
        return dest;
    }

    if (d < s || d >= s + n) {
        for (size_t i = 0; i < n; ++i) {
            d[i] = s[i];
        }
    } else {
        for (size_t i = n; i > 0; --i) {
            d[i - 1] = s[i - 1];
        }
    }

    return dest;
}
```

## `size_t` 反向循环注意事项

`size_t` 是无符号整数，不能写：

```cpp
for (size_t i = n - 1; i >= 0; --i) {
    d[i] = s[i];
}
```

因为 `i >= 0` 对无符号整数永远为真，`i` 从 0 再减 1 会下溢成很大的值。

正确写法：

```cpp
for (size_t i = n; i > 0; --i) {
    d[i - 1] = s[i - 1];
}
```
