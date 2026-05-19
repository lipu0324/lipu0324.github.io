---
title: "Scala初探——类"
date: "2025-01-16 21:30:14"
updated: "2025-01-16 21:30:16"
wordpress_id: 77
wordpress_slug: "scala%e5%88%9d%e6%8e%a2-%e7%b1%bb"
categories:
  - "一生一芯"
---
<p>scala是一个面向对象的语言，大家都知道了，肯定有类这种东西是吧，那么我们来看一下类：</p>

<pre class="wp-block-code"><code>// WrapCounter counts up to a max value based on a bit size
class WrapCounter(counterBits: Int) {

  val max: Long = (1 &lt;&lt; counterBits) - 1
  var counter = 0L
    
  def inc(): Long = {
    counter = counter + 1
    if (counter > max) {
        counter = 0
    }
    counter
  }
  println(s"counter created with max value $max")
}</code></pre>

<p>这样我们就创建了一个类，他的输入参数是int类型的名字叫做counterBits，并且定义了一个val类型的long，初始化为2^counterBits-1，是用位宽计算计数器最大值的。然后我们有计数器变量counter为Long的0。</p>

<p>我们定义了一个方法，自增，也就是counter不断加一，并在超越max的时候归零，该方法返回当前的计数值，还记得吗？最后一行是返回值。</p>

<p>最后，println在创建的时候打印max数值。</p>

<h2 class="wp-block-heading">类的实例化</h2>

<p>实例化一个类很简单， 我们用上面的类进行描述吧，<code> val x = new WrapCounter(2)</code> 这样我们就创建了一个实例，叫x。</p>

<p></p>
