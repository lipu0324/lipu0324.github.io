---
title: "LeetCode 滑动窗口最大值：单调队列解法"
date: "2026-05-27 11:01:58"
updated: "2026-05-27 11:12:55"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "算法"
  - "单调队列"
  - "滑动窗口"
---

题目：[239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)

给定整数数组 `nums` 和大小为 `k` 的滑动窗口，窗口从数组最左侧逐次向右移动一位，要求返回每个窗口中的最大值。

例如：

```text
输入：nums = [1,3,-1,-3,5,3,6,7], k = 3
输出：[3,3,5,5,6,7]
```

## 解法：维护单调递减队列

如果每次移动窗口后都扫描其中的 `k` 个元素，时间复杂度会达到 `O(nk)`。更好的方法是维护一个双端队列：

- 队列中保存数组下标，而不是元素本身，这样可以判断队首是否已经离开窗口。
- 下标对应的元素值从队首到队尾单调递减，因此队首始终是当前窗口最大值。
- 新元素加入前，删除队尾所有不大于它的元素。这些旧元素更小、出现得更早，以后不可能再成为窗口最大值。

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        vector<int> result;
        deque<int> queue;

        for (int i = 0; i < nums.size(); ++i) {
            // 移除已经离开窗口的队首下标。
            if (!queue.empty() && queue.front() < i - k + 1) {
                queue.pop_front();
            }

            // 保持对应值从队首到队尾单调递减。
            while (!queue.empty() && nums[queue.back()] <= nums[i]) {
                queue.pop_back();
            }
            queue.push_back(i);

            // 窗口形成后，队首就是当前最大值。
            if (i >= k - 1) {
                result.push_back(nums[queue.front()]);
            }
        }
        return result;
    }
};
```

每个下标最多入队一次、出队一次，因此时间复杂度为 `O(n)`；队列最多保存 `k` 个下标，空间复杂度为 `O(k)`。
