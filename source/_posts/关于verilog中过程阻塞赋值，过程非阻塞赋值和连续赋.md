---
title: "关于verilog中过程阻塞赋值，过程非阻塞赋值和连续赋值的理解"
date: "2024-11-10 17:48:31"
updated: "2024-11-10 17:48:34"
wordpress_id: 9
wordpress_slug: "%e5%85%b3%e4%ba%8everilog%e4%b8%ad%e8%bf%87%e7%a8%8b%e9%98%bb%e5%a1%9e%e8%b5%8b%e5%80%bc%ef%bc%8c%e8%bf%87%e7%a8%8b%e9%9d%9e%e9%98%bb%e5%a1%9e%e8%b5%8b%e5%80%bc%e5%92%8c%e8%bf%9e%e7%bb%ad%e8%b5%8b"
categories:
  - "一生一芯"
---
<p>今天搭积木学到always块那边，针对这三个赋值的效果有一些理解，就先写下来这样。</p>

<p>首先always块是一个过程块，可以用一些条件进行激活，例如clk之类的，反正是这样类似的东西。在verilog中有三中赋值方式，分别是过程阻塞赋值，过程非阻塞赋值和连续赋值。</p>

<p>首先我们来说过程阻塞赋值，这个东西他只能在过程块内进行使用，外面不行，写法就是 <code>a = b</code> 这样，看起来就是很简单的赋值，但是我们要清楚一点，就是verilog本身是一种针对硬件的语言，所有的活动和代码都要对应物理的内容，在这情况下，赋值的先后顺序就很重要了。</p>

<p>过程阻塞赋值，顾名思义，这一段代码执行完成之前是不会进行下一步的，和其他编程语言十分相似。</p>

<p>然后我们来聊一下过程非阻塞赋值，顾名思义就是所有的赋值一起进行，他的写法是这样的： <code>a &lt;= b</code> ，举个例子：</p>

<pre class="wp-block-code"><code>always @(*) begin
    x = y;
    a &lt;= b;
    c &lt;= d;
end</code></pre>

<p>在上面这个区块内，我们的always逻辑如下：首先对x进行赋值，在赋值结束之前剩下的代码是不会运行的，在x的赋值结束以后，同时对a和b进行赋值。</p>

<p>注意，always块只有在括号内条件成立的时候才会进行运行，就像一个触发器。</p>

<p>最后说连续赋值，写法是这样的： <code>assign a = b;</code> 连续赋值相当于将a和b进行绑定，b改变的时候a也会同步改变。</p>

<p>这三就是这样的概念。</p>

<figure class="wp-block-image size-large"><img src="/uploads/2024/11/1731232096-96206e903bcfcea8f3c2799192ead576_720-768x1024.jpg" alt="" class="wp-image-10"/></figure>
