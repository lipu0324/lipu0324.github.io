---
title: "LeetCode 最长回文子串：动态规划解法"
date: "2026-05-27 15:09:44"
updated: "2026-05-27 15:24:43"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "算法"
  - "动态规划"
  - "字符串"
---

题目：[5. 最长回文子串](https://leetcode.cn/problems/longest-palindromic-substring/)

给定字符串 `s`，需要找到其中最长的回文子串。例如，`babad` 的答案可以是 `bab` 或 `aba`，`cbbd` 的答案是 `bb`。

## 状态定义与转移

定义 `dp[i][j]` 表示闭区间 `s[i..j]` 是否为回文串。判断一个区间时需要抓住三个条件：

- 长度为 1 的字符串一定是回文串。
- 长度为 2 或 3 时，只要首尾字符相同就是回文串。
- 长度大于 3 时，除了首尾字符相同，内部区间 `s[i+1..j-1]` 也必须是回文串。

因此状态转移可以写成：

```text
dp[i][j] = (s[i] == s[j]) && (长度 <= 3 || dp[i+1][j-1])
```

由于较长区间依赖更短的内部区间，枚举时应先处理短字符串，再逐步增加区间长度。

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        const int n = s.size();
        if (n < 2) return s;

        vector<vector<bool>> dp(n, vector<bool>(n, false));
        int start = 0;
        int maxLength = 1;

        for (int i = 0; i < n; ++i) {
            dp[i][i] = true;
        }

        for (int length = 2; length <= n; ++length) {
            for (int i = 0; i + length <= n; ++i) {
                const int j = i + length - 1;
                if (s[i] == s[j]) {
                    dp[i][j] = length <= 3 || dp[i + 1][j - 1];
                }

                if (dp[i][j] && length > maxLength) {
                    start = i;
                    maxLength = length;
                }
            }
        }

        return s.substr(start, maxLength);
    }
};
```

这里共有 `O(n²)` 个区间状态，每个状态常数时间完成转移，因此时间复杂度为 `O(n²)`，空间复杂度也是 `O(n²)`。
