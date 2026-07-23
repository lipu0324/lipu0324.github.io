---
title: "LeetCode 零钱兑换：完全背包式动态规划"
date: "2026-05-27 17:33:00"
updated: "2026-05-27 17:34:29"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "算法"
  - "动态规划"
  - "完全背包"
---

题目：[322. 零钱兑换](https://leetcode.cn/problems/coin-change/)

给定不同面额的硬币 `coins` 和总金额 `amount`，每种硬币可以使用无限次。目标是计算凑成总金额所需的最少硬币数；如果无法凑成，则返回 `-1`。

例如：

```text
输入：coins = [1,2,5], amount = 11
输出：3
解释：11 = 5 + 5 + 1
```

## 状态定义

定义一维数组 `dp[i]`：

```text
dp[i] = 凑成金额 i 所需的最少硬币数
```

目标是求出 `dp[amount]`。金额 0 不需要任何硬币，因此 `dp[0] = 0`；其他状态先设为不可达的无穷大。

## 状态转移

要凑出金额 `i`，可以枚举最后使用的硬币 `coin`。如果金额 `i - coin` 已经可达，那么加入这枚硬币后：

```text
dp[i] = min(dp[i], dp[i - coin] + 1)
```

因为每种硬币可以重复使用，所以同一个面额会参与多个金额状态的转移。

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, INT_MAX);
        dp[0] = 0;

        for (int current = 1; current <= amount; ++current) {
            for (int coin : coins) {
                if (current >= coin && dp[current - coin] != INT_MAX) {
                    dp[current] = min(dp[current], dp[current - coin] + 1);
                }
            }
        }

        return dp[amount] == INT_MAX ? -1 : dp[amount];
    }
};
```

设硬币种类数为 `m`，时间复杂度为 `O(amount × m)`，空间复杂度为 `O(amount)`。用 `INT_MAX` 表示不可达时，转移前必须先判断前一状态是否可达，以避免加一后整数溢出。
