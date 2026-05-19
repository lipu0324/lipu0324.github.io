---
title: "Chisel初探——控制流程"
date: "2025-01-23 13:58:22"
updated: "2025-01-23 13:58:24"
wordpress_id: 99
wordpress_slug: "chisel%e5%88%9d%e6%8e%a2-%e6%8e%a7%e5%88%b6%e6%b5%81%e7%a8%8b"
categories:
  - "一生一芯"
---
<p>我们都知道在很多语言中我们需要控制流程，比如ifelse之类的，在硬件中，这类动作也是有很多需求的，在Chisel中，我们可以通过很多方便的语句来实现这些功能</p>

<p>首先，虽然在Verilog中的赋值语句其实是链接，但是在Chisel中，我们却可以使用多个赋值语句，其中位于最后的赋值语句才会生效，举个例子：</p>

<pre class="wp-block-code"><code>class LastConnect extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(4.W))
    val out = Output(UInt(4.W))
  })
  io.out := 1.U
  io.out := 2.U
  io.out := 3.U
  io.out := 4.U
}

//  Test LastConnect
test(new LastConnect) { c => c.io.out.expect(4.U) } // Assert that the output correctly has 4
println("SUCCESS!!") // Scala Code: if we get here, our tests passed!</code></pre>

<p>这一段代码运行的结果是正确的，只有4.U被成功赋值，也可以理解为之前的赋值被覆盖了。</p>

<h2 class="wp-block-heading">when，elsewhen与otherwise</h2>

<p>这些代码的功能与ifelse类似，我们来讲讲这玩意怎么运行的，其实和ifelse差不多，举个例子：</p>

<pre class="wp-block-code"><code> when(io.in1 >= io.in2 &amp;&amp; io.in1 >= io.in3) {
    io.out := io.in1  
  }.elsewhen(io.in2 >= io.in3) {
    io.out := io.in2 
  }.otherwise {
    io.out := io.in3
  }</code></pre>

<p>其实就是ifelse对吧，只要满足when内部的bool数值，他就会执行后面的代码，不然就换到合理的地方执行</p>

<p></p>
