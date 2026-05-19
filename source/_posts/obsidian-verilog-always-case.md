---
title: "Verilog中的always块、if语句与case语句"
date: "2025-06-29 15:53:56"
updated: "2025-07-04 14:35:37"
obsidian: true
categories:
  - "FPGA"
tags:
  - Verilog
---

## Always块

当我们需要实现时序逻辑或者简单的选择器的时候，我们就需要使用Always块来进行操作了，无论是在组合逻辑之中还是在时序逻辑之中我们都可以使用always块来快速达成一些操作，十分方便。

Always块的语法如下：
```verilog
always @(*) begin  //组合逻辑的always块写法案例
 //块内内容
end
always @(posedge clk)begin
//块内内容
end
```
他们的区别主要其实在于，@（）之中的内容不同，需要注意的是，括号中的内容是always块需要监控的内容的列表，星号表示全部监控，也就是说只要有数据变化就会触发我们always块中的内容，而使用posedge等则表示监控某个信号的上升沿，用来创造时序电路。
在always块中，我们可以使用if else 语法和 case语法等，十分方便，但是不能使用连续赋值语句，需要注意。

---

## if语句

if语句可以用来创建多路选择器等部件，我们可以使用if语句进行判断来进行描写。
举个例子：
```verilog 
// synthesis verilog_input_version verilog_2001
module top_module(
    input a,
    input b,
    input sel_b1,
    input sel_b2,
    output wire out_assign,
    output reg out_always   ); 
    assign out_assign = (sel_b1&sel_b2) ?b:a;
    always @(*)begin 
        if(sel_b1&sel_b2)
            out_always = b;
        else 
            out_always = a;
    end
endmodule
```
在这个内容中，我们发现，下方的always块和上方的assign效果相同。

---

## case语句

case语句用于多重选择，他的语法可以参考如下代码：
```verilog
// synthesis verilog_input_version verilog_2001
module top_module ( 
    input [2:0] sel, 
    input [3:0] data0,
    input [3:0] data1,
    input [3:0] data2,
    input [3:0] data3,
    input [3:0] data4,
    input [3:0] data5,
    output reg [3:0] out   );//

    always@(*) begin  // This is a combinational circuit
        case(sel)
            3'b000:
                out = data0;
            3'b001:
                out = data1;
            3'b010:
                out = data2;
            3'b011:
                out = data3;
            3'b100:
                out = data4;
            3'b101:
                out = data5;
            default:out = 0;
        endcase
    end
endmodule
```
需要注意的是，所有的verilog语句之中，不适用缩进作为分割代码的方式，所以我们需要明白，任何代码块都需要用begin和end作为分割线。

此外，我们还可以使用x作为占位符来忽略所有我们不想要的case内容，我们可以参考以下内容
```verilog
// synthesis verilog_input_version verilog_2001
module top_module (
    input [3:0] in,
    output reg [1:0] pos  );
always @(*) begin
    casex (in)
        4'bxxx1: pos = 2'd0;   // in[0] 优先
        4'bxx10: pos = 2'd1;   // in[1] 优先
        4'bx100: pos = 2'd2;   // in[2] 优先
        4'b1000: pos = 2'd3;   // in[3] 优先
        default: pos = 2'd0;   // 全 0 时输出 0
    endcase
end
endmodule
```

这是一个优先译码器，所有的x指的是不在乎的内容。与此同时，x，z，？,都表示不在乎的意思，所以怎么写都无所谓。
接下来我们可以使用这个方案来对一些我们需要的情况进行选择性的识别了。

**小贴士**：针对多情况的case，有的时候一个default没用的，可以在always块之前先写下默认情况。例如这个：
```verilog
module top_module (
    input [15:0] scancode,
    output reg left,
    output reg down,
    output reg right,
    output reg up  ); 
    always@(*)begin
        up = 1'b0; down = 1'b0; left = 1'b0; right = 1'b0;
        case(scancode)
            16'he06b:left = 1'b1;
            16'he072:down = 1'b1;
            16'he074:right= 1'b1;
            16'he075:up = 1'b1;
        endcase
    end
endmodule
```
