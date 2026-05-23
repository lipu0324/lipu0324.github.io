---
title: "其他的 Verilog 特性"
date: "2025-07-04 14:33:08"
updated: "2025-07-06 17:14:26"
obsidian: true
categories:
  - "FPGA"
tags:
  - "技能学习"
  - "FPGA"
  - "Verilog"
---
## 条件三元运算符

Verilog的一些语法和C语言相似，举个例子，三元运算符就是其中之一。
`(condition ? if_true : if_false)`
`(sel ? b : a)`
这个没什么多说的

---
## 向量运算符

简单来说，向量运算符的作用是用来对整个向量进行位运算，可以减少写法的长度。
```verilog
& a[3:0]     // AND: a[3]&a[2]&a[1]&a[0]. Equivalent to (a[3:0] == 4'hf)
| b[3:0]     // OR:  b[3]|b[2]|b[1]|b[0]. Equivalent to (b[3:0] != 4'h0)
^ c[2:0]     // XOR: c[2]^c[1]^c[0]
```

---
## for循环语句

for循环语句在always块中才可以使用，使用时需要注意，其语法和C语言类似：
在使用之前，我们需要设置一个循环使用的变量，使用关键字`integer`来标志变量，然后使用for语句进行数据处理，举个例子：
```verilog
module top_module( 
    input [99:0] in,
    output [99:0] out
);
    integer i;
    always@(*)begin
        for(i=0;i<100;i=i+1)begin
            out[i] = in[99-i];
        end
    end
endmodule
```

新的任务：一个“人口计数”电路用于计算输入向量中'1'的数量。为255位输入向量构建一个人口计数电路。
解决方案：
```verilog
module top_module( 
    input [254:0] in,
    output [7:0] out );
	integer i,count;
    always@(*)begin
        count = 0;
        for(i=0;i<255;i++)begin
            if(in[i]==1)
                count++;
            else ;
        end
    end
    assign out = count;
endmodule
```

---

## 批量生成语句

```verilog
generate
    // 生成语句
endgenerate
```
**generate 块可以包含：**
- `for` 循环（批量生成）
- `if ... else`（条件生成）
- `case`（条件选择）

```verilog
genvar i;
generate
    for (i = 0; i < N; i = i + 1) begin: label
        // 每次循环生成的硬件或模块实例
    end
endgenerate
```
- 必须用 `genvar` 作为循环变量。
- `label` 是每个循环体的名字，方便引用，如 `label[3].u_fa`。
举个例子，批量生成八个全加器的代码如下：
```verilog
module top_module(
    input [7:0] a, b,
    input cin,
    output [7:0] sum,
    output [7:0] cout
);
    genvar i;
    generate
        for (i = 0; i < 8; i = i + 1) begin: gen_adder
            if (i == 0) begin
                fa u_fa (
                    .a(a[i]),
                    .b(b[i]),
                    .cin(cin),
                    .sum(sum[i]),
                    .cout(cout[i])
                );
            end else begin
                fa u_fa (
                    .a(a[i]),
                    .b(b[i]),
                    .cin(cout[i-1]),
                    .sum(sum[i]),
                    .cout(cout[i])
                );
            end
        end
    endgenerate
endmodule
```
以这个代码为例子，我们首先要有一个label，也就是整个生成模块的整体名字，可以通过这个名字来对其中的每一个实例进行索引，然后我们要对大模块中的每一个小部分起名字。访问的时候用以下语句：`label[3].u_fa`
