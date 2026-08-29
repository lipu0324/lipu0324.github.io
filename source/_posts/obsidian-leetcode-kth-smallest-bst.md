---
title: "LeetCode 230：二叉搜索树中第 K 小的元素"
date: "2026-08-12 15:33:16"
updated: "2026-08-12 15:33:16"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "二叉搜索树"
  - "中序遍历"
---

题目：[230. 二叉搜索树中第 K 小的元素](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/)

二叉搜索树满足：左子树所有节点的值小于根节点，右子树所有节点的值大于根节点。因此，对它进行中序遍历时，访问顺序恰好就是节点值的递增顺序。问题于是转化为：在中序遍历过程中数到第 `k` 个节点并返回它。

```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        int visited = 0;
        return findKthSmallest(root, k, visited);
    }

private:
    int findKthSmallest(TreeNode* root, int k, int& visited) {
        if (!root) return -1;

        int left = findKthSmallest(root->left, k, visited);
        if (left != -1) return left;

        ++visited;
        if (visited == k) return root->val;

        return findKthSmallest(root->right, k, visited);
    }
};
```

`visited` 按“左子树—根—右子树”的顺序递增。当左子树已经找到答案时，直接向上返回；否则访问当前节点，若还没有到第 `k` 个，再继续遍历右子树。

如果树高为 `h`，并且在找到答案后立即停止，额外空间主要是递归栈，复杂度为 `O(h)`；最坏情况下需要访问整棵树，时间复杂度为 `O(n)`。如果需要支持大量连续查询，可以把中序遍历改写为显式栈，并在遍历状态之间复用迭代器。
