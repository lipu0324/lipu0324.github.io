---
title: "LeetCode 最长递增子序列：动态规划入门"
date: "2026-05-27 16:35:17"
updated: "2026-05-27 16:36:44"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "算法"
  - "动态规划"
  - "子序列"
---

题目：[300. 最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/)

给定整数数组 `nums`，要求找到最长严格递增子序列的长度。子序列不要求连续，但不能改变原有元素的相对顺序。

例如：

```text
输入：nums = [10,9,2,5,3,7,101,18]
输出：4
```

一个可行的最长递增子序列是 `[2,3,7,101]`。

## 动态规划思路

定义 `dp[i]` 为“以 `nums[i]` 结尾的最长严格递增子序列长度”。每个元素本身都能构成长度为 1 的子序列，所以初始值均为 1。

对于当前下标 `i`，枚举所有更早的下标 `j`。只有当 `nums[j] < nums[i]` 时，才能把 `nums[i]` 接到以 `nums[j]` 结尾的递增子序列之后：

```text
dp[i] = max(dp[i], dp[j] + 1)
```

最终答案是所有 `dp[i]` 中的最大值，而不一定是 `dp[n-1]`。

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        const int n = nums.size();
        if (n == 0) return 0;

        vector<int> dp(n, 1);
        int answer = 1;

        for (int i = 1; i < n; ++i) {
            for (int j = 0; j < i; ++j) {
                if (nums[j] < nums[i]) {
                    dp[i] = max(dp[i], dp[j] + 1);
                }
            }
            answer = max(answer, dp[i]);
        }

        return answer;
    }
};
```

两层枚举使时间复杂度为 `O(n²)`，`dp` 数组的空间复杂度为 `O(n)`。如果继续优化，可以用“贪心 + 二分查找”把时间复杂度降到 `O(n log n)`。
