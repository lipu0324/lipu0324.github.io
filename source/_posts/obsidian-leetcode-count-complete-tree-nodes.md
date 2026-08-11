---
title: "LeetCode 222：完全二叉树的节点个数"
date: "2026-08-11 16:54:06"
updated: "2026-08-11 17:01:28"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "二分查找"
  - "递归"
---

题目：[222. 完全二叉树的节点个数](https://leetcode.cn/problems/count-complete-tree-nodes/)

完全二叉树除最底层外每层都已填满，最底层节点集中在左侧。直接遍历所有节点可以得到 `O(n)` 解法，但题目希望利用完全二叉树的结构继续优化。

## 比较左右高度

分别计算当前子树最左侧和最右侧的高度：

- 如果两者相等，说明左子树一定是满二叉树，可以直接计算左子树节点数，再递归右子树。
- 如果两者不等，说明右子树一定是满二叉树，可以直接计算右子树节点数，再递归左子树。

高度为 `h` 的满二叉树节点数为 `2^h - 1`，加上当前根节点后，代码可以写成：

```cpp
class Solution {
public:
    int countNodes(TreeNode* root) {
        if (!root) return 0;

        const int leftDepth = depth(root->left);
        const int rightDepth = depth(root->right);

        if (leftDepth == rightDepth) {
            // 左子树是满二叉树。
            return (1 << leftDepth) + countNodes(root->right);
        }

        // 右子树是满二叉树。
        return (1 << rightDepth) + countNodes(root->left);
    }

private:
    int depth(TreeNode* node) {
        int result = 0;
        while (node) {
            ++result;
            node = node->left;
        }
        return result;
    }
};
```

每层递归都会计算若干次高度，树高为 `O(log n)`，所以总时间复杂度为 `O(log² n)`，递归空间复杂度为 `O(log n)`。
