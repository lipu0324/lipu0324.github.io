---
title: "Verilog中的always块、if语句与case语句"
date: "2025-06-29 15:53:56"
updated: "2025-07-04 14:35:37"
categories:
  - "FPGA"
tags:
  - "Verilog"
---

`always` 块是 Verilog 描述组合逻辑和时序逻辑时最常见的结构。它的关键不在于语法本身，而在于敏感列表和赋值方式共同决定了最终综合出的硬件。

## always块的两种常见形态

组合逻辑通常写成：

```verilog
always @(*) begin
    // combinational logic
end
```

时序逻辑通常写成：

```verilog
always @(posedge clk) begin
    // sequential logic
end
```

`@(*)` 表示由综合器自动推导敏感列表，只要相关输入变化就重新计算输出。`@(posedge clk)` 表示逻辑只在时钟上升沿更新，通常会综合成寄存器或触发器。

一个实用规则是：

- 组合逻辑中尽量给所有输出设置默认值，避免锁存器。
- 时序逻辑中使用非阻塞赋值 `<=`。
- 不要在 `always` 块中使用连续赋值语句 `assign`。

## if语句与多路选择器

`if` 可以很自然地描述选择器。例如：

```verilog
module top_module(
    input a,
    input b,
    input sel_b1,
    input sel_b2,
    output wire out_assign,
    output reg out_always
);
    assign out_assign = (sel_b1 & sel_b2) ? b : a;

    always @(*) begin
        if (sel_b1 & sel_b2)
            out_always = b;
        else
            out_always = a;
    end
endmodule
```

上面的 `assign` 和 `always @(*)` 在功能上等价，都会综合为一个二选一的组合逻辑。区别在于 `always` 更适合描述多分支、更复杂的组合判断。

## case语句

`case` 适合多路选择。一个典型例子如下：

```verilog
module top_module (
    input [2:0] sel,
    input [3:0] data0,
    input [3:0] data1,
    input [3:0] data2,
    input [3:0] data3,
    input [3:0] data4,
    input [3:0] data5,
    output reg [3:0] out
);
    always @(*) begin
        case (sel)
            3'b000: out = data0;
            3'b001: out = data1;
            3'b010: out = data2;
            3'b011: out = data3;
            3'b100: out = data4;
            3'b101: out = data5;
            default: out = 0;
        endcase
    end
endmodule
```

Verilog 不靠缩进划分代码块，所有复合语句都应该明确写出 `begin` 和 `end`。这也是 Verilog 和 Python 一类语言在阅读习惯上的主要区别。

## casex与优先译码

`casex` 可以用 `x`、`z` 或 `?` 表示不关心位，适合写优先译码器：

```verilog
module top_module (
    input [3:0] in,
    output reg [1:0] pos
);
    always @(*) begin
        casex (in)
            4'bxxx1: pos = 2'd0;
            4'bxx10: pos = 2'd1;
            4'bx100: pos = 2'd2;
            4'b1000: pos = 2'd3;
            default: pos = 2'd0;
        endcase
    end
endmodule
```

这里越靠前的分支优先级越高。比如 `4'bxxx1` 会优先匹配 `in[0]` 为 1 的情况。

## 默认值写法

当输出较多时，可以在 `case` 前先给默认值：

```verilog
always @(*) begin
    up = 1'b0;
    down = 1'b0;
    left = 1'b0;
    right = 1'b0;

    case (scancode)
        16'he06b: left = 1'b1;
        16'he072: down = 1'b1;
        16'he074: right = 1'b1;
        16'he075: up = 1'b1;
    endcase
end
```

这种方式能减少重复代码，同时避免某些分支没有给输出赋值而推导出锁存器。

## 结论

`always` 块的写法决定了硬件结构。`always @(*)` 更接近组合电路，`always @(posedge clk)` 更接近寄存器更新。`if` 和 `case` 都是描述选择逻辑的工具，真正需要关注的是是否覆盖完整分支、是否设置默认值，以及赋值方式是否符合组合或时序语义。
