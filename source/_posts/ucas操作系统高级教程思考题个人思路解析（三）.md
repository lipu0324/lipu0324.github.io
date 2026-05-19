---
title: "UCAS操作系统高级教程思考题个人思路解析（三）"
date: "2024-12-16 11:52:53"
updated: "2024-12-16 11:54:46"
wordpress_id: 46
wordpress_slug: "ucas%e6%93%8d%e4%bd%9c%e7%b3%bb%e7%bb%9f%e9%ab%98%e7%ba%a7%e6%95%99%e7%a8%8b%e6%80%9d%e8%80%83%e9%a2%98%e4%b8%aa%e4%ba%ba%e6%80%9d%e8%b7%af%e8%a7%a3%e6%9e%90%ef%bc%88%e4%b8%89%ef%bc%89"
categories:
  - "日常学习"
---
<ol><li>分析copy_page_tables（）函数的代码，叙述父进程如何为子进程复制页表。</li></ol>

<pre class="wp-block-code"><code>//代码路径：kernel/fork.c
int copy_mem(int nr,struct task_struct * p)
{
	......
	set_base(p-&gt;ldt&#91;1],new_code_base);//设置子进程代码段基址
	set_base(p-&gt;ldt&#91;2],new_data_base);//设置子进程数据段基址
	//为进程1创建第一个页表、复制进程0的页表，设置进程1的页目录项
	if (copy_page_tables(old_data_base,new_data_base,data_limit)) {
			free_page_tables(new_data_base,data_limit);
			return -ENOMEM;
		}
		return 0;
}

//代码路径：mm/memory.c
......
#define invalidate（）\
__asm__（"movl%%eax，%%cr3"："a"（0））//重置CR3为0
......
int copy_page_tables(unsigned long from,unsigned long to,long size)
{
	unsigned long * from_page_table;
	unsigned long * to_page_table;
	unsigned long this_page;
	unsigned long * from_dir, * to_dir;
	unsigned long nr;
/*0x3fffff是4 MB，是一个页表的管辖范围，二进制是22个1，||的两边必须同为0，所以，from和to后22位必须都为0，即4 MB的整数倍，意思是一个页表对应4 MB连续的线性地址空间必须是从0x000000开始的4 MB的整数倍的线性地址，不能是任意地址开始的4 MB，才符合分页的要求*/
	if ((from&amp;0x3fffff) || (to&amp;0x3fffff))
		panic("copy_page_tables called with wrong alignment");
/*一个页目录项的管理范围是4 MB，一项是4字节，项的地址就是项数×4，也就是项管理的线性地址起始地址的M数，比如：0项的地址是0，管理范围是0～4 MB，1项的地址是4，管理范围是4～8 MB，2项的地址是8，管理范围是8～12MB……＞＞20就是地址的MB数，＆0xffc就是＆111111111100b，就是4 MB以下部分清零的地址的MB数，也就是页目录项的地址*/
	from_dir = (unsigned long *) ((from&gt;&gt;20) &amp; 0xffc); /* _pg_dir = 0 */
	to_dir = (unsigned long *) ((to&gt;&gt;20) &amp; 0xffc);
	size = ((unsigned) (size+0x3fffff)) &gt;&gt; 22;
	for( ; size--&gt;0 ; from_dir++,to_dir++) {
		if (1 &amp; *to_dir)
			panic("copy_page_tables: already exist");
		if (!(1 &amp; *from_dir))
			continue;
		from_page_table = (unsigned long *) (0xfffff000 &amp; *from_dir);
		if (!(to_page_table = (unsigned long *) get_free_page()))
			return -1;	/* Out of memory, see freeing */
		*to_dir = ((unsigned long) to_page_table) | 7;
		nr = (from==0)?0xA0:1024;
		for ( ; nr-- &gt; 0 ; from_page_table++,to_page_table++) {
			this_page = *from_page_table;
			if (!(1 &amp; this_page))
				continue;
			this_page &amp;= ~2;
			*to_page_table = this_page;
			if (this_page &gt; LOW_MEM) {
				*from_page_table = this_page;
				this_page -= LOW_MEM;
				this_page &gt;&gt;= 12;
				mem_map&#91;this_page]++;
			}
		}
	}
	invalidate();
	return 0;
}
</code></pre>

<p>进入copy_page_tables（）以后，首先申请一个页面，将进程0的前160个页表项复制到这个页面中，形成了进程1的页表，由于一个页表管理4k的地址，那么这个页表管理了640KB的内存地址。此时进程0和1的页表指向相同的地址，也就是说进程1也可以控制进程0的页面了。接下来再对进程1的页表进行设置，刷新TLB来应用所有的更改，此时进程0和1使用同一套的内存管理架构，进程1也还没有装入用户程序。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>2. 进程0创建进程1时，为进程1建立了task_struct及内核栈，第一个页表，分别位于物理内存两个页。请问，这两个页的位置，究竟占用的是谁的线性地址空间，内核、进程0、进程1、还是没有占用任何线性地址空间？说明理由（可以图示）并给出代码证据。</p>

<p>占用的都是内核的线性地址空间，在寻找以及创建新页表的过程中，根据获取页面的算法，都是从menmap的末尾向前寻找，在这个语境下，我们发现，获取到的页面位于16MB地址的末尾，但是我们已经知道，无论是进程0还是进程1的页表都只能控制前640KB的线性地址，那么，既然不是进程0和进程1的线性地址，那就只能是内核的线性地址空间了，实际上这一部分的内存确实能够被内核的页表所控制。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>3. 假设：经过一段时间的运行，操作系统中已经有5个进程在运行，且内核为进程4、进程5分别创建了第一个页表，这两个页表在谁的线性地址空间？用图表示这两个页表在线性地址空间和物理地址空间的映射关系。</p>

<p>这两个都是在内核空间，图不画了。<strong>注意：一个进程需要16个页目录表项</strong></p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>4. </p>

<pre class="wp-block-code"><code>#define switch_to(n) {\
struct {long a,b;} __tmp; \
__asm__("cmpl %%ecx,_current\n\t" \
    "je 1f\n\t" \
    "movw %%dx,%1\n\t" \
    "xchgl %%ecx,_current\n\t" \
    "ljmp %0\n\t" \
    "cmpl %%ecx,_last_task_used_math\n\t" \
    "jne 1f\n\t" \
    "clts\n" \
    "1:" \
    ::"m" (*&amp;__tmp.a),"m" (*&amp;__tmp.b), \
    "d" (_TSS(n)),"c" ((long) task&#91;n])); \
}
</code></pre>

<p>代码中的"ljmp %0\n\t" 很奇怪，按理说jmp指令跳转到得位置应该是一条指令的地址，可是这行代码却跳到了"m" (*&amp;__tmp.a)，这明明是一个数据的地址，更奇怪的，这行代码竟然能正确执行。请论述其中的道理。</p>

<p>因为ljmp一共有两个参数，分别是段选择子和偏移量，在本题的代码中，使用代码 <code> "movw %%dx,%1\n\t" \</code> 将处理器各个寄存器等存入进程0的TSS中，然后将进程1的TSS恢复到处理器中，ljmp使用了恢复来的段选择子tmp.b与偏移值tmp.a进行了跳转，实现了进程切换。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>5. 进程0开始创建进程1，调用fork（），跟踪代码时我们发现，fork代码执行了两次，第一次，执行fork代码后，跳过init（）直接执行了for(;;) pause()，第二次执行fork代码后，执行了init（）。奇怪的是，我们在代码中并没有看到向转向fork的goto语句，也没有看到循环语句，是什么原因导致fork反复执行？请说明理由（可以图示），并给出代码证据。</p>

<p>因为在fork函数的进程中，调用了0x80中断，自动将epi等进行了压栈，而且epi的值为0x80的下一段代码，在创建进程1的过程中，进程0将自己的TSS直接传送给了进程1，并将eax修改成了0，而进程0中的eax为1，这就导致了进程0和进程1在返回时给到的返回值不同，虽然进程0和进程1由于相同的eip从相同的位置也就是fork继续，但是由于进程1的返回值是0，进入了init（）函数。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>6. 详细分析进程调度的全过程。考虑所有可能（signal、alarm除外）</p>

<p>首先是所有的进程时间片都没有用完而且都就绪，那么此时寻找一个时间片最大的运行。</p>

<p>还有存在就绪进程时间片全部用完的情况，就用counter+优先级/2的算法计算一个优先级再进行调度</p>

<p>还有就是所有的进程都没有就绪，那就调度进程0运行空转。</p>

<p>7. 分析panic函数的源代码，根据你学过的操作系统知识，完整、准确的判断panic函数所起的作用。假如操作系统设计为支持内核进程（始终运行在0特权级的进程），你将如何改进panic函数？</p>

<p>Panic函数的作用是用来在系统出现不可恢复故障的时候尽可能的保存数据以及给出警告。首先判断出现问题的进程是不是进程0，假如不是进程0就将数据进行同步并且给出报错。<br>        假如操作系统支持内核进程，panic函数应该可以跳转到内核进程中，使得内核能继续运行。</p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>8. b_dirt已经被置为1的缓冲块，同步前能够被进程继续读、写？给出代码证据。</p>

<p>能够继续读写，但是不能关联其他的硬盘块，b_dirt是针对硬盘的，表示这个缓冲块本身已经被修改，无论进程对缓冲块如何读写，只要保证最后进行同步将数据同步到硬盘上就行。</p>

<p>9. wait_on_buffer函数中为什么不用if（）而是用while（）？</p>

<p>很多进程都在等待一个缓冲块。在缓冲块同步完毕，唤醒各等待进程到轮转到某一进程的过程中，很有可能此时的缓冲块又被其它进程所占用，并被加上了锁。此时如果用if()，则此进程会从之前被挂起的地方继续执行，不会再判断是否缓冲块已被占用而直接使用，就会出现错误；而如果用while()，则此进程会再次确认缓冲块是否已被占用，在确认未被占用后，才会使用，这样就不会发生之前那样的错误<br></p>

<hr class="wp-block-separator has-alpha-channel-opacity"/>

<p>10. 分析ll_rw_block(READ,bh)读硬盘块数据到缓冲区的整个流程（包括借助中断形成的类递归），叙述这些代码实现的功能。</p>

<figure class="wp-block-image size-large"><img src="/uploads/2024/12/1734320153-image-1024x534.png" alt="" class="wp-image-47"/></figure>

<p></p>

<p></p>

<p></p>

<p></p>

<p></p>
