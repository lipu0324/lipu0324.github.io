---
title: "Vivado开发流程与Verilog仿真入门"
date: "2025-06-22 14:41:52"
updated: "2025-07-13 15:08:01"
obsidian: true
categories:
  - "FPGA"
tags:
  - Vivado
  - Verilog
---

## Vivado软件开发细节
![[Pasted image 20250622150549.png]]
以本图为例，在创建工程之后，首先需要创建新的Verilog文件，如图：![[Pasted image 20250622150643.png]]
通过一系列设置加入文件并编写以后，通过按钮：**Schematic** 能够查看编写完成的内容的门电路级别电路图，以当前的电路为例，这个电路是一个关于 d触发器的闪烁灯泡的电路，具体的内容如下：
``` Verilog
module learning(
//当前我们期望这个模块用来进行D触发器
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
        end
     else if (counter == 25_000_000)begin
        counter <=0;
        outpin <=~outpin;
        end
     else 
        counter <= counter + 1'd1;
        end
endmodule
```
## 电路模拟
![[Pasted image 20250622151905.png]]
这就是经过模拟之后的电路模式，虽然我们不能直接通过这个门级电路来看出我们的设计有没有问题，但是我们可以在某些极端情况下认识到可能设计存在问题，例如在第一次设计这个内容的时候，出现了一些错误语句，导致生成的电路很**简洁** ，最终发现仿真结果确实不行。发现是少写了一个语句导致的。

---
## 逻辑仿真

Vivado自带一些简单的仿真工具，目前我们只需要使用这些仿真工具就可以了，那么这一段我们来介绍Vivado仿真工具的使用。
1. 首先，Vivado需要针对仿真进行一些操作，主要部分就是关于仿真文件的编写，在vivado中，仿真文件也是一个verilog文件，在这种情况下，我们需要在仿真文件中进行一些操作，首先我们创建一个仿真文件。
2. 仿真文件创建之后，需要对需要进行测试的模块进行例化，意思就是将我们的模块丢在测试文件中准备测试，以刚才的文件为例子，我们描述的仿真文件如下：
```Verilog
module learning_tb(
    );
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
针对文件的处理如下，首先我们将待测试文件的定义丢过来，就有点像我们在C语言等语言之众所做的一样，紧接着我们需要在测试模块中设置激励数据源，也就是上面的那些reg，我们会通过reg文件来控制测试模块的运转。
然后我们需要将被测试模块和测试模块的激励数据源进行链接，链接的方式很简答，在被测试模块中的端口前加入符号 **.**  并且将激励数据源放入之后的括号中。需要注意的是，输出端口只需要链接wire即可，软件就可以读取内容了。
3. 编写激励文件的运行模式：我们需要按照自己的意愿驱动激励数据源，此时需要使用语法如下，首先我们使用 `initial`字段初始化所有的内容，然后使用`always`语句驱动clk，在驱动时，我们可以使用#+数字来表示延迟时间的长度。还可以通过$stop来控制运转的时间长度。
![[Pasted image 20250622174720.png]]
运行结果如图所示，符合预期。
