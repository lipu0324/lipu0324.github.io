---
title: "UCAS操作系统高级教程思考题个人思路解析（二）"
date: "2024-12-13 17:47:34"
updated: "2024-12-13 17:47:38"
wordpress_id: 44
wordpress_slug: "ucas%e6%93%8d%e4%bd%9c%e7%b3%bb%e7%bb%9f%e9%ab%98%e7%ba%a7%e6%95%99%e7%a8%8b%e6%80%9d%e8%80%83%e9%a2%98%e4%b8%aa%e4%ba%ba%e6%80%9d%e8%b7%af%e8%a7%a3%e6%9e%90%ef%bc%88%e4%ba%8c%ef%bc%89"
categories:
  - "日常学习"
---
<p>1、计算内核代码段、数据段的段基址、段限长、特权级。</p>

<p>不用算，内核代码段数据段基址都是0，长度都是整个线性空间，也就是16MB，特权集是0。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>2、计算进程0的代码段、数据段的段基址、段限长、特权级。</p>

<p>在 Linux 0.11 中，进程0的代码段和数据段的段基址都是 0x00000000；代码段和数据段的段限长均设置为160*4KB=640KB；特权级为0特权级。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>3、fork进程1之前，为什么先调用move_to_user_mode()？用的是什么方法？解释其中的道理。</p>

<ol><li>在Linux中规定，除了进程0以外的所有进程都是由另一个进程在特权级3下创建的，进程0本身处在特权级0下，需要先反转到特权级3才可以</li>

<li>在Linux系统中，切换特权级的方法是模拟硬件压栈，首先将所需要的数据等压入栈中，然后使用iret进行返回，模拟从内核态中返回的效果，使用栈中的数据恢复现场，变化为3特权级。</li>

<li>原理是CPU在返回的时候会根据给出的寄存器值进行特权级切换。</li></ol>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>4、根据什么判定move_to_user_mode()中iret之后的代码为进程0的代码。</p>

<pre class="wp-block-code"><code>#define move_to_user_mode() \
__asm__ ("movl %%esp,%%eax\n\t" \
	"pushl $0x17\n\t" \
	"pushl %%eax\n\t" \
	"pushfl\n\t" \
	"pushl $0x0f\n\t" \
	"pushl $1f\n\t" \
	"iret\n" \
	"1:\tmovl $0x17,%%eax\n\t" \
	"movw %%ax,%%ds\n\t" \
	"movw %%ax,%%es\n\t" \
	"movw %%ax,%%fs\n\t" \
	"movw %%ax,%%gs" \
	:::"ax")
</code></pre>

<p>在iret指令执行以后，系统已经从0特权级转换为3特权级，准备创建进程1，接下来的代码是用来初始化进程一用的，此时整个系统里面只有进程0在运行，所以很明显那是进程0的代码。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>5、进程0的task_struct在哪？具体内容是什么？给出代码证据。</p>

<p>进程0的task_struct位于内核数据区，因为在进程0未激活之前，使用的是boot阶段的user_stack，因此存储在user_stack中。<br>具体内容：包含了进程 0 的进程状态、进程 0 的 LDT、进程 0 的 TSS 等等。其中 ldt 设置了代码段和堆栈段的基址和限长(640KB)，而 TSS 则保存了各种寄存器的值，包括各个段选择符。<br></p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>6、在system.h里</p>

<pre class="wp-block-code"><code>#define _set_gate(gate_addr,type,dpl,addr) \
__asm__ ("movw %%dx,%%ax\n\t" \
"movw %0,%%dx\n\t" \
"movl %%eax,%1\n\t" \
"movl %%edx,%2" \
: \
: "i" ((short) (0x8000+(dpl&lt;&lt;13)+(type&lt;&lt;8))), \
"o" (*((char *) (gate_addr))), \
"o" (*(4+(char *) (gate_addr))), \
"d" ((char *) (addr)),"a" (0x00080000))

#define set_intr_gate(n,addr) \
_set_gate(&amp;idt&#91;n],14,0,addr)

#define set_trap_gate(n,addr) \
_set_gate(&amp;idt&#91;n],15,0,addr)

#define set_system_gate(n,addr) \
_set_gate(&amp;idt&#91;n],15,3,addr)
</code></pre>

<p>读懂代码。这里中断门、陷阱门、系统调用都是通过_set_gate设置的，用的是同一个嵌入汇编代码，比>>较明显的差别是dpl一个是3，另外两个是0，这是为什么？说明理由。</p>

<p>那是因为中断门和陷阱门两个都必须在特权级0下进行使用，而系统调用是用户程序进行调用的，需要在特权级3下进行</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>7、分析get_free_page()函数的代码，叙述在主内存中获取一个空闲页的技术路线。</p>

<pre class="wp-block-code"><code>//代码路径：mm\memory.c
unsigned long get_free_page(void)
{
register unsigned long __res asm("ax");

__asm__("std ; repne ; scasb\n\t"
	"jne 1f\n\t"
	"movb $1,1(%%edi)\n\t"
	"sall $12,%%ecx\n\t"
	"addl %2,%%ecx\n\t"
	"movl %%ecx,%%edx\n\t"
	"movl $1024,%%ecx\n\t"
	"leal 4092(%%edx),%%edi\n\t"
	"rep ; stosl\n\t"
	"movl %%edx,%%eax\n"
	"1:"
	:"=a" (__res)
	:"0" (0),"i" (LOW_MEM),"c" (PAGING_PAGES),
	"D" (mem_map+PAGING_PAGES-1)
	:"di","cx","dx");
return __res;
}
</code></pre>

<p>通过逆向扫描页表位图 mem_map，找到内存中（从高地址开始）第一个空闲（字节为0）页面，将其置为1。ecx左移12位加LOW_MEM获得该页的物理地址，并将页面清零。最后返回空闲页面物理内存的起始地址。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>8、copy_process函数的参数最后五项是：long eip,long cs,long eflags,long esp,long ss。查看栈结构确实有这五个参数，奇怪的是其他参数的压栈代码都能找得到，确找不到这五个参数的压栈代码，反汇编代码中也查不到，请解释原因。详细论证其他所有参数是如何传入的。</p>

<p>那是因为这五项参数是由于调用fork函数的时候自动压栈进行完成的，fork函数中调用了一次0x80中断，使得直接将这五个参数压入了栈中，正好成为了这个函数的参数。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>9、详细分析Linux操作系统如何设置保护模式的中断机制。</p>

<p>①中断描述符表 (IDT) 初始化:<br>在保护模式下，IDT用于存放中断处理程序的地址。每个中断或异常都有一个与之相关联的中断描述符。Linux在启动时设置这个IDT。</p>

<p>②初始化中断控制器 (PIC):<br>为了接收来自外部硬件的中断，Linux首先需要初始化可编程中断控制器 (PIC)。这是一个芯片，负责从外部硬件接收中断请求并将它们传递给CPU。</p>

<p>③设置中断处理程序:<br>Linux为每个可能的中断或异常设置了一个中断处理程序。这些处理程序在内核启动时初始化，并与特定的中断或异常号相关联。</p>

<p>④加载IDT寄存器:<br>使用lidt指令加载IDT的地址和大小。这告诉CPU在哪里可以找到中断描述符表。</p>

<p>⑤开启中断:<br>通过设置CPU的标志寄存器中的中断标志（IF）来启用中断。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>10、分析Linux操作系统如何剥夺用户进程访问内核及其他进程的能力。</p>

<p>Linux操作系统是基于段和页面进行控制的，同时结合了访问控制相关的内容。在Linux中，长跳转指令不允许跨越特权级，也就是说一个进程是不能通过长跳转来到需要0特权级的内核代码段的，这样就阻止了用户程序访问内核代码段。</p>

<p>关于用户进程访问其他用户进程的问题，首先，每个用户只能使用自己段内的虚拟地址，在试图跳转到段外时，由于默认使用本地的段表也就是LDT中的内容，始终无法跨越本段内部的地址空间，也就无法方案其他进程的数据和代码了。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>11. 分析后面两行代码的意义。</p>

<pre class="wp-block-code"><code>_system_call:
 cmpl $nr_system_calls-1,%eax
 ja bad_sys_call</code></pre>

<p>这两行代码用来对比eax中传来的中断数是否超过了中断表的最大值，超过了就表示这玩意有问题，越界了，就报错。</p>

<p></p>

<p></p>

<p></p>
