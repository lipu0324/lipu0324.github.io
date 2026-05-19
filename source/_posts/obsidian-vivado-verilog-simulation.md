---
title: "Vivado开发流程与Verilog仿真入门"
date: "2025-06-22 14:41:52"
updated: "2025-07-13 15:08:01"
categories:
  - "FPGA"
tags:
  - "Vivado"
  - "Verilog"
---

这篇笔记整理 Vivado 中从工程创建、RTL 编写到逻辑仿真的基本流程。它更适合作为一个上手 checklist：先确认模块能综合出合理电路，再用 testbench 验证时序行为。

## 工程与源文件

创建工程以后，首先需要加入新的 Verilog 源文件。RTL 文件描述的是硬件结构，而不是一段顺序执行的软件过程，因此写完以后可以通过 Vivado 的 schematic 视图查看综合出的门级或寄存器级结构。

以下是一个用计数器驱动输出翻转的简单例子：

```verilog
module learning(
    clk,
    reset_n,
    outpin
);
    input clk;
    input reset_n;
    output reg outpin;

    reg [24:0] counter;

    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            counter <= 0;
            outpin <= 0;
        end else if (counter == 25_000_000) begin
            counter <= 0;
            outpin <= ~outpin;
        end else begin
            counter <= counter + 1'd1;
        end
    end
endmodule
```

这里有几个容易被忽略的点：

- 复位逻辑需要覆盖关键寄存器，否则仿真初态可能是 `x`。
- 时序逻辑中使用非阻塞赋值 `<=`，让寄存器在同一个时钟边沿同时更新。
- `else` 分支最好写完整，避免综合结果和预期不一致。

## 查看综合结构

Vivado 的 schematic 不能替代仿真，但很适合做早期 sanity check。如果一个本应包含计数器和触发器的设计被综合成很简单的组合电路，通常说明 RTL 写法漏掉了条件、时钟边沿或寄存器赋值。

我更倾向于把 schematic 当作“结构预览”：

- 设计中应该出现的寄存器是否真的存在。
- 计数器位宽是否符合预期。
- 复位路径和输出路径是否被综合出来。
- 是否出现明显不合理的常量折叠。

## Testbench 基本结构

Vivado 自带仿真工具足够覆盖入门阶段。仿真文件本质上也是 Verilog 文件，只是它不描述要落到板子上的硬件，而是用来产生激励、例化待测模块并观察输出。

以上面的 `learning` 模块为例：

```verilog
module learning_tb;
    reg clk_tb;
    reg reset_n_tb;
    wire outpin_tb;

    learning learning_inst0(
        .clk(clk_tb),
        .reset_n(reset_n_tb),
        .outpin(outpin_tb)
    );

    initial clk_tb = 1;
    always #10 clk_tb = ~clk_tb;

    initial begin
        reset_n_tb = 0;
        #201;
        reset_n_tb = 1;
        #2000_000_000;
        $stop;
    end
endmodule
```

这个 testbench 包含三个核心部分：

1. 用 `reg` 驱动输入激励。
2. 用 `wire` 接收 DUT 的输出。
3. 用 `initial` 和 `always` 描述时钟、复位与仿真停止条件。

## 对接端口

例化模块时，推荐使用命名端口连接：

```verilog
.clk(clk_tb),
.reset_n(reset_n_tb),
.outpin(outpin_tb)
```

这种写法比按位置连接更清楚，后续模块端口数量增加时也更不容易接错。

## 结论

Vivado 入门阶段的最低闭环是：写 RTL、看结构、写 testbench、跑波形。只看 RTL 很容易漏掉硬件语义，只看 schematic 又无法确认时序行为，仿真才是判断设计是否按预期工作的主要手段。
