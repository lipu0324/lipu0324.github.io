---
title: "Chisel初探——模块"
date: "2025-01-17 12:57:57"
updated: "2025-01-17 12:58:00"
wordpress_id: 92
wordpress_slug: "chisel%e5%88%9d%e6%8e%a2-%e6%a8%a1%e5%9d%97"
categories:
  - "一生一芯"
---
<p>我们都知道Chisel是一个HDL，而且他的输出结果是Verilog，也就是说我们在Scala中写出来的东西资然也是Verilog内部就存在的东西，其中一个最经典的内容就是模块了。今天我们来看模块，也是Verilog中最重要的内容，可以说Verilog的所有内容都是基于模块的，可见这玩意的重要性质。</p>

<p>首先在写模块之前我们要先把一些库导入，这些库用来解决Chisel的依赖问题，毕竟Chisel是基于Scala的语言嘛。</p>

<pre class="wp-block-code"><code>import chisel3._
import chisel3.util._
import chisel3.tester._
import chisel3.tester.RawTester.test
import dotvisualizer._</code></pre>

<p>接下来让我们来写第一个模块吧。</p>

<pre class="wp-block-code"><code>class Passthrough extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(4.W))
    val out = Output(UInt(4.W))
  })
  io.out := io.in
}</code></pre>

<p>我们来解析一下这个模块，首先这个模块是一个class，这点毋庸置疑，毕竟我们选择Scala就是因为他的面向对象属性。这个模块叫做Passthrough，从名字上能看出来，而且所有的模块都是继承Module类的，这是规定记住就行，接下来我们看IO部分，首先我们用约定俗称的名称io作为io的合集，类型是val，很合理，毕竟物理上的芯片输入输出的种类和数量可不会动来动去的。<br>接下来就是重要部分，我们使用IO方法来定义IO的内容，使用Bundel把他们放在一起，Input表示输入，Output指输出，其中的Uint指的是数据类型，而4.W指的是位宽4位的数据。<br>输入输出以后就是内部的内容了，我们时刻记住，硬件的连接不是按照顺序进行运行的，就好比assign，这表示硬件上连接在一起了，我们在Chisel中的对应写法是 : = ，和assign起到了一样的效果。</p>

<p>接下来让我们把他变成verilog，用这一句 <code>println(getVerilog(new Passthrough))</code> 就可以得到了：</p>

<pre class="wp-block-code"><code>module Passthrough(
  input        clock,
  input        reset,
  input  &#91;3:0] io_in,
  output &#91;3:0] io_out
);
  assign io_out = io_in; // @&#91;cmd3.sc 6:10]
endmodule</code></pre>

<p>于此同时，你是否还记得，scala语言的类是支持输入参数的？我们可以用这个参数来解决很多问题，请看如下的代码</p>

<pre class="wp-block-code"><code>// Chisel Code, but pass in a parameter to set widths of ports
class PassthroughGenerator(width: Int) extends Module { 
  val io = IO(new Bundle {
    val in = Input(UInt(width.W))
    val out = Output(UInt(width.W))
  })
  io.out := io.in
}

// Let's now generate modules with different widths
println(getVerilog(new PassthroughGenerator(10)))
println(getVerilog(new PassthroughGenerator(20)))</code></pre>

<p>是的，我们接受了来自外界的参数，这样的结果是什么呢，其实就是在不同的初始化条件下，我们获得了不同的模块，我们的结果如下：</p>

<pre class="wp-block-preformatted">Elaborating design...<br>Done elaborating.<br>module PassthroughGenerator(<br>  input        clock,<br>  input        reset,<br>  input  [9:0] io_in,<br>  output [9:0] io_out<br>);<br>  assign io_out = io_in; // @[cmd5.sc 6:10]<br>endmodule<br><br>Elaborating design...<br>Done elaborating.<br>module PassthroughGenerator(<br>  input         clock,<br>  input         reset,<br>  input  [19:0] io_in,<br>  output [19:0] io_out<br>);<br>  assign io_out = io_in; // @[cmd5.sc 6:10]<br>endmodule</pre>

<p>是不是出现了两个不同的模块呢，这样相对就很灵活了。</p>

<figure class="wp-block-image size-large"><img src="/uploads/2025/01/1737089841-1-4-683x1024.jpg" alt="" class="wp-image-94"/></figure>
