---
title: "LeetCode 129：求根节点到叶节点数字之和"
date: "2026-08-11 15:54:55"
updated: "2026-08-11 16:03:02"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "深度优先搜索"
  - "递归"
---

题目：[129. 求根节点到叶节点数字之和](https://leetcode.cn/problems/sum-root-to-leaf-numbers/)

树中每个节点保存一个 `0` 到 `9` 的数字。一条从根节点到叶节点的路径表示一个数字，例如 `1 -> 2 -> 3` 表示 `123`，要求计算所有路径对应数字的总和。

## DFS 携带当前路径值

从父节点走到子节点时，原来的数字左移一位，再加上当前节点值：

```text
current = current × 10 + node->val
```

只有走到叶节点时，当前路径才构成一个完整数字并加入答案。

```cpp
class Solution {
public:
    int sumNumbers(TreeNode* root) {
        int answer = 0;
        dfs(root, 0, answer);
        return answer;
    }

private:
    void dfs(TreeNode* node, int current, int& answer) {
        if (!node) return;

        current = current * 10 + node->val;
        if (!node->left && !node->right) {
            answer += current;
            return;
        }

        dfs(node->left, current, answer);
        dfs(node->right, current, answer);
    }
};
```

每个节点只访问一次，时间复杂度为 `O(n)`；递归栈的空间复杂度为 `O(h)`，其中 `h` 是树高。
