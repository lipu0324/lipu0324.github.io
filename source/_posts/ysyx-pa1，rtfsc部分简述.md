---
title: "YSYX PA1，RTFSC部分简述"
date: "2025-02-02 16:54:21"
updated: "2025-02-02 16:54:23"
wordpress_id: 101
wordpress_slug: "ysyx-pa1%ef%bc%8crtfsc%e9%83%a8%e5%88%86%e7%ae%80%e8%bf%b0"
categories:
  - "一生一芯"
---
<p>总的来说，这一段的内容都是关于NEMU代码的内容，要谈到这一个部分，首先就需要了解什么是NEMU</p>

<p>NEMU（NJU Emulator）最早是由南京大学实现的一个用于教学的计算机指令集体系结构（<a href="https://so.csdn.net/so/search?q=ISA&amp;spm=1001.2101.3001.7020" target="_blank" rel="noreferrer noopener">ISA</a>）模拟器，香山处理器团队基于2019版的NEMU进行增强和维护，用于香山处理器前期RISC-V指令集和体系结构的模拟。</p>

<p>简而言之，这玩意就是个模拟器，能够在X86的架构上模拟其他的架构的处理器进行运行，这一次RTFSC，实际上就是简单了解整个NEMU模拟器的代码基本面貌。</p>

<p>首先我们来看整个文件的结构，NEMU作为YSYX的一个组成部分，其本身可以当作一个单独的工程，他的结构如下：</p>

<pre class="wp-block-code"><code>nemu
├── configs                    # 预先提供的一些配置文件
├── include                    # 存放全局使用的头文件
│   ├── common.h               # 公用的头文件
│   ├── config                 # 配置系统生成的头文件, 用于维护配置选项更新的时间戳
│   ├── cpu
│   │   ├── cpu.h
│   │   ├── decode.h           # 译码相关
│   │   ├── difftest.h
│   │   └── ifetch.h           # 取指相关
│   ├── debug.h                # 一些方便调试用的宏
│   ├── device                 # 设备相关
│   ├── difftest-def.h
│   ├── generated
│   │   └── autoconf.h         # 配置系统生成的头文件, 用于根据配置信息定义相关的宏
│   ├── isa.h                  # ISA相关
│   ├── macro.h                # 一些方便的宏定义
│   ├── memory                 # 访问内存相关
│   └── utils.h
├── Kconfig                    # 配置信息管理的规则
├── Makefile                   # Makefile构建脚本
├── README.md
├── resource                   # 一些辅助资源
├── scripts                    # Makefile构建脚本
│   ├── build.mk
│   ├── config.mk
│   ├── git.mk                 # git版本控制相关
│   └── native.mk
├── src                        # 源文件
│   ├── cpu
│   │   └── cpu-exec.c         # 指令执行的主循环
│   ├── device                 # 设备相关
│   ├── engine
│   │   └── interpreter        # 解释器的实现
│   ├── filelist.mk
│   ├── isa                    # ISA相关的实现
│   │   ├── mips32
│   │   ├── riscv32
│   │   ├── riscv64
│   │   └── x86
│   ├── memory                 # 内存访问的实现
│   ├── monitor
│   │   ├── monitor.c
│   │   └── sdb                # 简易调试器
│   │       ├── expr.c         # 表达式求值的实现
│   │       ├── sdb.c          # 简易调试器的命令处理
│   │       └── watchpoint.c   # 监视点的实现
│   ├── nemu-main.c            # 你知道的...
│   └── utils                  # 一些公共的功能
│       ├── log.c              # 日志文件相关
│       ├── rand.c
│       ├── state.c
│       └── timer.c
└── tools                      # 一些工具
    ├── fixdep                 # 依赖修复, 配合配置系统进行使用
    ├── gen-expr
    ├── kconfig                # 配置系统
    ├── kvm-diff
    ├── qemu-diff
    └── spike-diff</code></pre>

<p>首先，整个NEMU项目可以支持多种架构指令集，例如riscv的32/64，mips指令集以及传统的X86指令集，我们可以通过make menuconfig的方式来选择各类架构，实现不同的学习目标，不过在我们YSYX中，我们选择使用riscv标准的架构进行学习，也就是riscv32。</p>

<p>关于项目内部的所有配置位置我们目前不太需要了解，只需要在需要的时候翻看手册就行，我们的主要目的是使用menucongif</p>

<figure class="wp-block-image size-full"><img src="/uploads/2025/02/1738481456-image.png" alt="" class="wp-image-103"/></figure>

<p>在这里选择我们需要的ISA等即可。</p>

<h2 class="wp-block-heading">代码</h2>

<p>众所周知，我们的任何程序都是从main函数开始执行的，那么，这个NEMU的main函数在哪里呢？答案是在nemu-main.c文件中，接下来我们就从main函数开始理清整个工程如何运行。首先我们看nemu-main文件的内容，我们就不看版权声明和开源协议了，直接看代码。</p>

<pre class="wp-block-code"><code>#include &lt;common.h>

void init_monitor(int, char *&#91;]);
void am_init_monitor();
void engine_start();
int is_exit_status_bad();

int main(int argc, char *argv&#91;]) {
  /* Initialize the monitor. */
#ifdef CONFIG_TARGET_AM
  am_init_monitor();
#else
  init_monitor(argc, argv);
#endif
  /* Start engine. */
  engine_start();

  return is_exit_status_bad();
}
</code></pre>

<p>首先我们进入函数中，init_monitor,这个部分用来初始化监视器，监视器是NEMU项目的一个重要组成部分，在init_monitor这个函数中，初始化了ISA，内存等等内容，毕竟这是个模拟器，需要对模拟机的各个部分进行模拟对吧。。</p>

<pre class="wp-block-code"><code>void init_monitor(int argc, char *argv&#91;]) {
  /* Perform some global initialization. */

  /* Parse arguments. */
  parse_args(argc, argv);

  /* Set random seed. */
  init_rand();

  /* Open the log file. */
  init_log(log_file);

  /* Initialize memory. */
  init_mem();

  /* Initialize devices. */
  IFDEF(CONFIG_DEVICE, init_device());

  /* Perform ISA dependent initialization. */
  init_isa();

  /* Load the image to memory. This will overwrite the built-in image. */
  long img_size = load_img();

  /* Initialize differential testing. */
  init_difftest(diff_so_file, img_size, difftest_port);

  /* Initialize the simple debugger. */
  init_sdb();

  IFDEF(CONFIG_ITRACE, init_disasm());

  /* Display welcome message. */
  welcome();
}
</code></pre>

<p>在结束monitor的init之后，我们就正式启动引擎了，进入函数engine_start() ，在enging_start()中，我们先进入cpu_exe函数如下：</p>

<pre class="wp-block-code"><code>void cpu_exec(uint64_t n) {
  g_print_step = (n &lt; MAX_INST_TO_PRINT);
  switch (nemu_state.state) {
    case NEMU_END: case NEMU_ABORT: case NEMU_QUIT:
      printf("Program execution has ended. To restart the program, exit NEMU and run again.\n");
      return;
    default: nemu_state.state = NEMU_RUNNING;
  }

  uint64_t timer_start = get_time();

  execute(n);

  uint64_t timer_end = get_time();
  g_timer += timer_end - timer_start;

  switch (nemu_state.state) {
    case NEMU_RUNNING: nemu_state.state = NEMU_STOP; break;

    case NEMU_END: case NEMU_ABORT:
      Log("nemu: %s at pc = " FMT_WORD,
          (nemu_state.state == NEMU_ABORT ? ANSI_FMT("ABORT", ANSI_FG_RED) :
           (nemu_state.halt_ret == 0 ? ANSI_FMT("HIT GOOD TRAP", ANSI_FG_GREEN) :
            ANSI_FMT("HIT BAD TRAP", ANSI_FG_RED))),
          nemu_state.halt_pc);
      // fall through
    case NEMU_QUIT: statistic();
  }
}</code></pre>

<p>这个函数的主要功能是设定处理器的状态，并且进行任务执行，任务执行的部分位于  execute(n);</p>

<pre class="wp-block-code"><code>static void execute(uint64_t n) {
  Decode s;
  for (;n > 0; n --) {
    exec_once(&amp;s, cpu.pc);
    g_nr_guest_inst ++;
    trace_and_difftest(&amp;s, cpu.pc);
    if (nemu_state.state != NEMU_RUNNING) break;
    IFDEF(CONFIG_DEVICE, device_update());
  }
}
</code></pre>

<p>用于执行处理器的指令，我们现在先不考虑这个东西。然后我们在enging_start中进入函数如下，这个函数主要用于接受外界给出的指令进行交互，也就是命令行指令：</p>

<pre class="wp-block-code"><code>void sdb_mainloop() {
  if (is_batch_mode) {
    cmd_c(NULL);
    return;
  }

  for (char *str; (str = rl_gets()) != NULL; ) {
    char *str_end = str + strlen(str);

    /* extract the first token as the command */
    char *cmd = strtok(str, " ");
    if (cmd == NULL) { continue; }

    /* treat the remaining string as the arguments,
     * which may need further parsing
     */
    char *args = cmd + strlen(cmd) + 1;
    if (args >= str_end) {
      args = NULL;
    }

#ifdef CONFIG_DEVICE
    extern void sdl_clear_event_queue();
    sdl_clear_event_queue();
#endif

    int i;
    for (i = 0; i &lt; NR_CMD; i ++) {
      if (strcmp(cmd, cmd_table&#91;i].name) == 0) {
        if (cmd_table&#91;i].handler(args) &lt; 0) { return; }
        break;
      }
    }

    if (i == NR_CMD) { printf("Unknown command '%s'\n", cmd); }
  }
}
</code></pre>

<p>至此，基础框架就是这些了。</p>
