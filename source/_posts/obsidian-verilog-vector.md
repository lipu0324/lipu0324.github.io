---
title: "Verilog 向量"
date: "2025-06-23 14:22:06"
updated: "2025-07-03 21:28:04"
obsidian: true
categories:
  - "FPGA"
tags:
  - "Verilog"
  - "技能学习"
  - "FPGA"
---
## 向量的概念

与普通的数学中的向量类似但又不太像，向量指的是一组有序的信号量，例如一根位宽为8的导线可以使用向量来进行表示，向量在设计中有很广泛的应用，例如绝大部分器件之间的连接都是使用向量进行连接的。

## 向量的声明和使用

我们可以在各种器件之前定义向量，例如
```Verilog
wire [99:0] my_vector; // Declare a 100-element vector 
assign out = my_vector[10]; // Part-select one bit out of the vector
```
在这一段代码中，我们首先定义了一个位宽为100的向量my_vector，我们发现，向量定义的位宽是放在向量名称之前的，与C语言中的情况不同，需要注意。
与此同时我们发现取用向量中某一个位数的方式与C语言相同，上方代码块中的第二行体现了这个情况。

## 隐含向量创建可能导致的问题

当我们使用assign将未定义的变量连接到向量的时候并不会给新变量赋予向量属性，而是变成一根导线，所以**不要使用assign创建向量** 。

## 向量的访问

向量可以通过指定位宽或者特定位进行访问，方法如下：
``` Verilog
w[3:0]      // Only the lower 4 bits of w
x[1]        // The lowest bit of x
x[1:1]      // ...also the lowest bit of x
z[-1:-2]    // Two lowest bits of z
b[3:0]      // Illegal. Vector part-select must match the direction of the declaration.
b[0:3]      // The *upper* 4 bits of b.
assign w[3:0] = b[0:3];    // Assign upper 4 bits of b to lower 4 bits of w. w[3]=b[0], w[2]=b[1], etc.
```

## 在向量中使用门电路

之前我们提到，各种布尔运算符都有位运算和逻辑运算版本[[02_技能学习/Verilog学习/各种门和基础部件|各种门和基础部件]]。当使用向量时，这两种运算符类型的区别变得很重要。两个 N 位向量之间的位运算会对向量的每个位执行相同的运算，并产生一个 N 位输出，而逻辑运算将整个向量视为一个布尔值（真=非零，假=零）并产生一个 1 位输出。
需要注意的是，||表示逻辑，|表示按位。其他运算符也是类似的情况。
归约（reduction）操作符：对于一个向量，我们可以在向量前直接放置运算符表示对整个向量进行运算，例如以下模块：
```Verilog
module top_module( 
    input [3:0] in,
    output out_and,
    output out_or,
    output out_xor
);
	assign out_and = &in,out_or = |in,out_xor = ^in;
endmodule
```
这个代码的功能就是对整个向量进行运算。

## 部分向量选择

通过大括号可以对向量进行拼接，但是拼接时需要知道向量的位宽。举个例子：
```Verilog
input [15:0] in;
output [23:0] out;
assign {out[7:0], out[15:8]} = in;         // Swap two bytes. Right side and left side are both 16-bit vectors.
assign out[15:0] = {in[7:0], in[15:8]};    // This is the same thing.
assign out = {in[7:0], in[15:8]};       // This is different. The 16-bit vector on the right is extended to match the 24-bit vector on the left, so out[23:16] are zero.In the first two examples, out[23:16] are not assigned.
```
## 多层向量集合

连接操作符允许将向量连接起来形成一个更大的向量。但有时你想要多次连接相同的内容，而像 assign a = {b,b,b,b,b,b}; 这样的操作仍然很繁琐。复制操作符允许重复一个向量并将它们连接起来：

{num{vector}}

此操作将_向量_复制 _num_ 次。_num_ 必须是一个常量。需要两个大括号。


``` Verilog

{5{1'b1}}           // 5'b11111 (or 5'd31 or 5'h1f)
{2{a,b,c}}          // The same as {a,b,c,a,b,c}
{3'd5, {2{3'd6}}}   // 9'b101_110_110. It's a concatenation of 101 with
                    // the second vector, which is two copies of 3'b110.
```
**需要注意的是，在表示多次重复的时候需要在整体外面添加一对大括号**
