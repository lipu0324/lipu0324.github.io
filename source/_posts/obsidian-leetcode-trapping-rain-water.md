---
title: "LeetCode 接雨水：双指针解法"
date: "2026-05-27 09:54:46"
updated: "2026-05-27 10:05:22"
obsidian: true
categories:
  - "技能学习"
tags:
  - "LeetCode"
  - "技能学习"
  - "算法"
  - "双指针"
---
给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**示例 1：**

![](https://assets.leetcode.cn/aliyun-lc-upload/uploads/2018/10/22/rainwatertrap.png)

**输入** height = [0,1,0,2,1,0,1,3,2,1,2,1]
**输出** 6
**解释** 上面是由数组 [0,1,0,2,1,0,1,3,2,1,2,1] 表示的高度图，在这种情况下，可以接 6 个单位的雨水（蓝色部分表示雨水）。 
**示例 2：**
**输入** height = [4,2,0,3,2,5]
**输出**9
**提示：**
- `n == height.length`
- `1 <= n <= 2 * 104`
- `0 <= height[i] <= 105`
---
## 解法：
解法基本两种，分别是计算左边最大和右边最大之后扫描每个台阶的存水量，这种计算所需要的时间和空间都比较大，需要扫描三次，2n大小的空间。我们将其略过。另外一种解法是通过一次扫描解决问题。简单来说，一个位置上的存水量和他左右两侧最低的情况是吻合的。也就是说，只要右侧超过了左侧，那么左侧的最高高度与当前位置的差值就是存水量。反之亦然。
所以解答如下：
```C++
class Solution {
public:
    int trap(vector<int>& height) {
        int left = 0;
        int right = height.size()-1;
        int ans = 0;
        int leftMax = 0,rightMax = 0;
        while(left < right)
        {
            if(height[left] < height [right])
            {
                leftMax = max(height[left],leftMax);
                ans+=leftMax - height[left];
                left++;
            }
            else 
            {
                rightMax = max(height[right],rightMax);
                ans+= rightMax - height[right];
                right--;
            }
        }
        return ans;
    }
};
```
