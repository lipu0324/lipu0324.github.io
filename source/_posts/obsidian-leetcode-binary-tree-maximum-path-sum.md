---
title: "LeetCode 124：二叉树中的最大路径和"
date: "2026-08-11 16:06:12"
updated: "2026-08-11 16:28:01"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "二叉树"
  - "树形动态规划"
  - "深度优先搜索"
---

题目：[124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)

路径可以从任意节点开始和结束，不要求经过根节点，但同一节点最多经过一次。需要返回所有合法路径中的最大节点和。

## “向上贡献”与“局部答案”

对每个节点，递归函数返回它能够向父节点贡献的最大单边路径：父节点只能继续选择左边或右边的一条路径。但当当前节点作为整条路径的最高点时，左右两边可以同时接入，因此要单独更新全局答案。

负收益不会让路径变大，所以子树贡献小于 0 时直接按 0 处理：

```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        int answer = INT_MIN;
        maxGain(root, answer);
        return answer;
    }

private:
    int maxGain(TreeNode* node, int& answer) {
        if (!node) return 0;

        const int leftGain = max(0, maxGain(node->left, answer));
        const int rightGain = max(0, maxGain(node->right, answer));

        // 当前节点作为路径最高点，左右子树可以同时使用。
        answer = max(answer, node->val + leftGain + rightGain);

        // 返回给父节点时只能选择一侧。
        return node->val + max(leftGain, rightGain);
    }
};
```

每个节点只处理一次，时间复杂度为 `O(n)`；递归栈空间复杂度为 `O(h)`。`answer` 必须初始化为 `INT_MIN`，否则全是负数的树会被错误处理。
