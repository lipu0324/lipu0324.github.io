---
title: "LeetCode 117：填充每个节点的下一个右侧节点指针 II"
date: "2026-08-11 10:53:12"
updated: "2026-08-11 11:16:15"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "广度优先搜索"
---

题目：[117. 填充每个节点的下一个右侧节点指针 II](https://leetcode.cn/problems/populating-next-right-pointers-in-each-node-ii/)

给定一棵不一定是满二叉树的二叉树，为每一层的节点建立 `next` 链接，使它指向同层右侧的下一个节点；如果右侧没有节点，则指向 `nullptr`。

## 按层处理

虽然题目要求额外空间为常量级，但先用队列写出清晰的层序遍历更容易理解。每轮开始时记录队列长度，就能知道当前层有多少个节点：

```cpp
class Solution {
public:
    Node* connect(Node* root) {
        if (!root) return nullptr;

        queue<Node*> nodes;
        nodes.push(root);

        while (!nodes.empty()) {
            const int levelSize = nodes.size();
            Node* previous = nullptr;

            for (int i = 0; i < levelSize; ++i) {
                Node* current = nodes.front();
                nodes.pop();

                if (previous) previous->next = current;
                previous = current;

                if (current->left) nodes.push(current->left);
                if (current->right) nodes.push(current->right);
            }

            // 每层最右侧节点必须显式指向空。
            previous->next = nullptr;
        }

        return root;
    }
};
```

每个节点入队、出队一次，时间复杂度为 `O(n)`；队列的空间复杂度为 `O(w)`，其中 `w` 是树的最大宽度。若进一步利用已经建立的 `next` 链接，可以把额外空间优化到 `O(1)`。
