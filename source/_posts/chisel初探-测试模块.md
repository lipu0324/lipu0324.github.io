---
title: "Chisel初探——测试模块"
date: "2025-01-17 14:16:27"
updated: "2025-01-17 14:16:30"
wordpress_id: 96
wordpress_slug: "chisel%e5%88%9d%e6%8e%a2-%e6%b5%8b%e8%af%95%e6%a8%a1%e5%9d%97"
categories:
  - "一生一芯"
---
<p>现在我们进入模块测试这个部分，我们有了模块总得测试一下吧，现在我们就是用Chisel的模块测试功能来进行测试。首先看着一段代码：</p>

<pre class="wp-block-code"><code>// Scala Code: `test` runs the unit test. 
// test takes a user Module and has a code block that applies pokes and expects to the 
// circuit under test (c)
test(new Passthrough()) { c =>
    c.io.in.poke(0.U)     // Set our input to value 0
    c.io.out.expect(0.U)  // Assert that the output correctly has 0
    c.io.in.poke(1.U)     // Set our input to value 1
    c.io.out.expect(1.U)  // Assert that the output correctly has 1
    c.io.in.poke(2.U)     // Set our input to value 2
    c.io.out.expect(2.U)  // Assert that the output correctly has 2
}
println("SUCCESS!!") // Scala Code: if we get here, our tests passed!
</code></pre>

<p>让我们来逐行解释，首先我们使用一个方法 <code>test</code> 这个方法是专用于测试的，然后我们输入了一个新的实例，即是new Passthrough，然后我们有一个匿名函数，就是c，c指我们new出来的Passthrough，接下来的步骤是这样的，我们对内部的的元素进行输入与输出，poke是给输入指定数值用的，expect是为了检查用的，就这样。</p>

<p>很简单不是吗，至于时序电路的测试，我们未来再说。</p>

<figure class="wp-block-image size-large"><img src="/uploads/2025/01/1737094564-005-683x1024.jpg" alt="" class="wp-image-97"/></figure>
