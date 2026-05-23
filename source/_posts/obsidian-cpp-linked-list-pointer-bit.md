---
title: "链表双指针与位操作"
date: "2026-05-23 19:26:42"
updated: "2026-05-23 19:26:42"
obsidian: true
categories:
  - "技能学习"
tags:
  - "技能学习"
  - "C++"
  - "系统编程"
  - "链表"
  - "位操作"
---
# 链表双指针与位操作

## 删除链表倒数第 k 个节点

### 思路

使用 dummy node 和双指针可以统一处理删除头节点的情况。

步骤：

1. 创建 `dummy`，令 `dummy.next = head`。
2. `fast` 和 `slow` 都从 `dummy` 出发。
3. `fast` 先走 `k` 步。
4. `fast` 和 `slow` 同步移动，直到 `fast->next == nullptr`。
5. 此时 `slow->next` 是待删除节点。
6. 调整链接并释放目标节点。

### 实现

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

ListNode* removeKthFromEnd(ListNode* head, int k) {
    if (k <= 0) return head;

    ListNode dummy(0);
    dummy.next = head;

    ListNode* fast = &dummy;
    ListNode* slow = &dummy;

    for (int i = 0; i < k; ++i) {
        if (fast->next == nullptr) {
            return head;
        }
        fast = fast->next;
    }

    while (fast->next != nullptr) {
        fast = fast->next;
        slow = slow->next;
    }

    ListNode* toDelete = slow->next;
    slow->next = toDelete->next;
    delete toDelete;

    return dummy.next;
}
```

复杂度：

```text
Time: O(n)
Space: O(1)
```

## 位操作

第 `k` 位从 0 开始计数。

```cpp
#include <cstdint>

uint32_t setBit(uint32_t x, int k) {
    return x | (1u << k);
}

uint32_t clearBit(uint32_t x, int k) {
    return x & ~(1u << k);
}

bool checkBit(uint32_t x, int k) {
    return (x & (1u << k)) != 0;
}

uint32_t toggleBit(uint32_t x, int k) {
    return x ^ (1u << k);
}
```

## 为什么使用 `1u`

`1` 的类型通常是有符号 `int`。在 32 位 `int` 平台上，`1 << 31` 可能移到符号位，涉及有符号整数左移的未定义行为。使用 `1u` 可以让移位在无符号整数上进行。

## 移位边界

对于 `uint32_t`，移位位数必须满足：

```text
0 <= k < 32
```

如果 `k < 0` 或 `k >= 32`，C++ 中行为未定义。
