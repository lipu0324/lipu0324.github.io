---
title: "Chisel初探——关于scala语言"
date: "2025-01-16 10:57:11"
updated: "2025-01-16 10:57:40"
wordpress_id: 67
wordpress_slug: "chisel%e5%88%9d%e6%8e%a2-%e5%85%b3%e4%ba%8escala%e8%af%ad%e8%a8%80"
categories:
  - "一生一芯"
tags:
  - "Scale"
  - "Chisel"
---
<p>       Chise是一个基于scala语言的，托管嵌入式语言的语言，听起来很复杂对吧，在我的印象中，这个意思就是，我们可以用Chisel语言来写Verilog，这下好理解了对吧，那么，我们在学习Chisel语言之前，首先要学会Scala语言，这简直就是套娃，我们学了一门语言叫做Scala，然后我们用Scala来写Chisel，接着用Chisel来完成Verilog，好吧这简直太有趣了，现在就让我们开始学习Scala吧。</p>

<p>    首先我们推荐一个网站 <a rel="noreferrer noopener" href="https://mybinder.org/v2/gh/freechipsproject/chisel-bootcamp/master" target="_blank">Chisel Bootcamp</a> 这个网站用来学习Chisel，当然也包括前置内容Scala。那么就让我们开始学习吧。</p>

<h2>变量</h2>

<p>    Scala包含变量使用关键字 var 进行标记，而常量使用关键字 val 进行标记，也就是说， 使用var进行标记的变量是可以动的，而val标记的常量他不能改变，就这么简单。举个例子：</p>

<pre class="wp-block-code"><code>var numberOfKittens = 6
val kittensPerHouse = 101
val alphabet = "abcdefghijklmnopqrstuvwxyz"
var done = false</code></pre>

<p>这一段代码里面，我们的numberOfKittens 是个变量，可以改变，而kitten...那玩意就不能变化。看起来Scala语言自带了自动分辨数据类型的功能，这太好了。</p>

<figure class="wp-block-image size-full is-resized"><img src="/uploads/2025/01/1736917347-image.png" alt="" class="wp-image-68" width="772" height="318"/><figcaption class="wp-element-caption">就像这样，他们会自动识别变量的类型</figcaption></figure>

<p>    接下来我们明确一个事实，scala语言不需要分号进行分割，他会自动识别（什么python）</p>

<h2>条件语句</h2>

<p>    我们都知道条件语句在一个编程语言中显得十分重要，scala语言中的条件语句写起来很简单</p>

<pre class="wp-block-code"><code>// A simple conditional; by the way, this is a comment
if (numberOfKittens &gt; kittensPerHouse) { 
    println("Too many kittens!!!") 
}
// The braces are not required when all branches are one liners. However, the 
// Scala Style Guide prefers brace omission only if an "else" clause is included.
// (Preferably not this, even though it compiles...)
if (numberOfKittens &gt; kittensPerHouse) 
    println("Too many kittens!!!")

// ifs have else clauses, of course
// This is where you can omit braces!
if (done) 
    println("we are done")
else 
    numberOfKittens += 1

// And else ifs
// For style, keep braces because not all branches are one liners. 
if (done) {
    println("we are done")
}
else if (numberOfKittens &lt; kittensPerHouse) {
    println("more kittens!")
    numberOfKittens += 1
}
else {
    done = true
}</code></pre>

<p>好像没什么好说的，和其他语言大同小异。不过需要注意的是，scala语句中的if会返回一个数值，这个数值的内容和if分支的最后一行有关，这太有用了，我们举例如下：</p>

<pre class="wp-block-code"><code>val likelyCharactersSet = if (alphabet.length == 26)
    "english"
else 
    "not english"

println(likelyCharactersSet)</code></pre>

<figure class="wp-block-image size-full is-resized"><img src="/uploads/2025/01/1736918198-image.png" alt="" class="wp-image-69" width="784" height="136"/><figcaption class="wp-element-caption">运行结果长这样</figcaption></figure>

<h2>函数</h2>

<p>        函数也叫方法，反正无论你怎么理解，就是函数，在scala中，函数使用def语句进行定义（嗨呀好像某个语言啊，是谁呢），在scala中，函数的参数是由一系列由逗号分割的列表指定的，形式如下 <code>def times2(x: Int): Int = 2 * x</code> 很显然，我们这一段代码定义了一个函数叫times2，属于是一个x，数据类型是int，冒号后面的内容就是函数的内部了。返回值的类型是写在冒号后面的第一个类型标识符。<br>       与此同时，我们也支持重载，但是不建议这样做。</p>

<pre class="wp-block-code"><code>def distance(x: Int, y: Int, returnPositive: Boolean): Int = {
    val xy = x * y
    if (returnPositive) xy.abs else -xy.abs
}</code></pre>

<h3>  递归和嵌套函数</h3>

<p>       在函数里面可以定义其他的函数，也可以递归调用，但是只在上层函数的作用域里面生效。</p>

<h2>列表</h2>

<p>       Scala 实现了多种聚合或序列对象。列表与数组非常相似，但支持附加的追加和提取操作。</p>

<pre class="wp-block-code"><code>val x = 7
val y = 14
val list1 = List(1, 2, 3)
val list2 = x :: y :: y :: Nil       // An alternate notation for assembling a list

val list3 = list1 ++ list2           // Appends the second list to the first list
val m = list2.length
val s = list2.size

val headOfList = list1.head          // Gets the first element of the list
val restOfList = list1.tail          // Get a new list with first element removed

val third = list1(2)                 // Gets the third element of a list (0-indexed)</code></pre>

<p>以这个为例子，我们来学习scala中的列表等内容，首先看到第一行 <code>val list1 = List(1, 2, 3)</code> 使用List方法创建了一个包含三个元素的不可变列表list1，注意使用的是val而不是var。Scala 中的 <code>List</code> 是一个泛型集合，<code>List(1, 2, 3)</code> 的类型是 <code>List[Int]</code>，表示一个包含整型元素的列表。</p>

<p>使用<code>::</code>运算符也可以创建列表，就如同第四行所写的，<code>::</code> 运算符是用于在列表头部添加元素的符号，读作 "cons"（构造）。<code>x :: y :: y :: Nil</code> 的含义是依次将 <code>x</code>、<code>y</code>、<code>y</code> 添加到一个空列表 <code>Nil</code> 上：<code>val list2 = List(7, 14, 14)</code>就是运行的结果，我们在其他的编程语言里似乎没有见过这种写法，还挺有意思的。</p>

<p>列表运算：scala中的列表是可以运算的，举个例子，val list3 = list1 ++ list2 中，++运算符号用于拼接两个列表，产生一个新的列表如 List(1, 2, 3, 7, 14, 14)。此外，列表可以作为一个对象，调用方法length和size来计算大小。</p>

<p>另外，列表的访问使用的是普通括号而不是大括号，需要注意。</p>

<h2>For语句</h2>

<p>scala的循环使用for语句进行，工作方式类似与传统的for语句，但是语法上略有区别。</p>

<pre class="wp-block-code"><code>for (i &lt;- 0 to 7) { print(i + " ") }
for (i &lt;- 0 until 7) { print(i + " ") }
for(i &lt;- 0 to 10 by 2) { print(i + " ") }
val randomList = List(scala.util.Random.nextInt(), scala.util.Random.nextInt(), scala.util.Random.nextInt(), scala.util.Random.nextInt())
var listSum = 0
for (value &lt;- randomList) {
  listSum += value
}
println("sum is " + listSum)</code></pre>

<p>看代码就知道他们是干啥的对吧，就这么简单。</p>

<figure class="wp-block-image size-large"><img src="/uploads/2025/01/1736996218-1-22-683x1024.jpg" alt="" class="wp-image-72"/></figure>
