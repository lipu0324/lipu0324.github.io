---
title: "Verilator初探——基本仿真流程"
date: "2025-01-14 20:01:38"
updated: "2025-01-14 20:01:40"
wordpress_id: 65
wordpress_slug: "verilator%e5%88%9d%e6%8e%a2-%e5%9f%ba%e6%9c%ac%e4%bb%bf%e7%9c%9f%e6%b5%81%e7%a8%8b"
categories:
  - "一生一芯"
---
<p>YSYX的流程中，我们Verilator是必不可少的工具，学习Verilator是我们进入ysyx学习的第一步，也是非常关键的一个部分，那么我们该如何学习verilator呢，这个工具又是如何运行的呢？本篇文章就来讲解这一个部分。</p>

<h2>Verilator的安装</h2>

<p>我们选择的是ysyx的推荐安装方法，GIt快速安装，这种方法安装方便而且速度快<br>首先我们输入以下的前置命令：</p>

<pre class="wp-block-code"><code># Prerequisites:
#sudo apt-get install git help2man perl python3 make autoconf g++ flex bison ccache
#sudo apt-get install libgoogle-perftools-dev numactl perl-doc
#sudo apt-get install libfl2  # Ubuntu only (ignore if gives error)
#sudo apt-get install libfl-dev  # Ubuntu only (ignore if gives error)
#sudo apt-get install zlibc zlib1g zlib1g-dev  # Ubuntu only (ignore if gives error)</code></pre>

<p>接下来我们开始clone库，别和我说你整不下来，那我得骂你了</p>

<pre class="wp-block-code"><code>git clone https://github.com/verilator/verilator</code></pre>

<p>接下来我们切换到目录，选择我们需要的特定版本</p>

<pre class="wp-block-code"><code>cd verilator
git pull         
git tag          
git checkout master
git checkout stable
git checkout v{version}</code></pre>

<p>注意，最后一行的大括号是妹用的，举个例子，我们需要5.008版本，那我们输入的内容是这样的：<code>git checkout v5.008</code><br>接下来按照顺序输入以下指令即可</p>

<pre class="wp-block-code"><code>autoconf         # Create ./configure script
./configure      # Configure and create Makefile
make -j `nproc`  # Build Verilator itself (if error, try just 'make')
sudo make install</code></pre>

<h2>Verilator的基本应用</h2>

<p>首先我们要明确，Verilator运行的原理，为了方便，接下来Verilator简称为Va，Va的工作原理是将Verilog文件以及测试用外层C++代码编译成一个可运行的文件，执行文件就可以看到运行的结果了，那么我们就来实操一下：<br>首先我们在Playground里面建立一个Verilog文件，我们叫他a，要仿真的Verilog文件的名称接下来称为 a.vhd ，文件内容如下：</p>

<pre class="wp-block-code"><code>module top(
  input a,
  input b,
  output f
);
  assign f = a ^ b;
endmodule</code></pre>

<p>很明显这是一个异或门，接下来我们需要明确一个要点：在Va的编译过程中，我们会产生一系列的文件，其中有一个非常重要，那就是 Va.h，举个例子，假如你要模拟的模块文件名字叫做switch，那么生成的文件就叫做Vswitch.h，这个文件在编写模拟仿真用的C++文件时候非常有用，我们必须include这个文件才能正常运行。</p>

<p>接下来我们来看我这一次准备的C++文件：</p>

<pre class="wp-block-code"><code>#include "verilated.h"
#include "Vswitch.h"

int main(int argc, char **argv, char **env)
{
    Vswitch vswitch;
    while(1)
    {
        //交替随机改变输入
        vswitch.a = rand() % 2;
        vswitch.b = rand() % 2;
        vswitch.eval();
        printf("a = %d, b = %d, out = %d\n", vswitch.a, vswitch.b, vswitch.f);
    }
}</code></pre>

<p>我们来逐行分析这个玩意，首先我们的inlcude，第一个include是一定要有的，第二个按照你的文件名字进行修改，就是{V+你的模块文件名字}，接下来我们进入main函数，基础的不说了，我们首先要实例化我们的模块，然后接下来的操作就是对你的实例进行操作了。</p>

<p>举个例子，我们的模块有几个输入与输出，我们操作他们的方式就直接是 {实例}.a之类的方式进行访问。<br>最后，我们需要进行一行 vswitch.eval(); 代码进行仿真，至此，Va的基础操作就完成了。</p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>
