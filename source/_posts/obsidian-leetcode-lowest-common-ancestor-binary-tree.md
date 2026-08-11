---
title: "LeetCode 236：二叉树的最近公共祖先"
date: "2026-08-11 17:51:32"
updated: "2026-08-11 18:51:59"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "递归"
  - "最近公共祖先"
---

题目：[236. 二叉树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/)

给定一棵二叉树和两个节点 `p`、`q`，找到它们的最近公共祖先。按照题目定义，节点可以是自己的祖先，因此当当前节点就是 `p` 或 `q` 时可以直接返回当前节点。

## 递归返回值的含义

对以 `root` 为根的子树，递归函数只返回三种信息：

- 找到 `p`，返回 `p`；
- 找到 `q`，返回 `q`；
- 两个节点都在子树中，返回它们的最近公共祖先；
- 都没找到，返回 `nullptr`。

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(
        TreeNode* root,
        TreeNode* p,
        TreeNode* q
    ) {
        if (!root || root == p || root == q) {
            return root;
        }

        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);

        // p、q 分别位于左右子树时，当前节点就是答案。
        if (left && right) return root;

        // 两个节点都在同一侧，继续返回找到的结果。
        return left ? left : right;
    }
};
```

算法访问每个节点最多一次，时间复杂度为 `O(n)`；递归栈空间复杂度为 `O(h)`。该写法假设题目保证 `p` 和 `q` 都存在于树中。
