---
title: TypeScript 高性能游戏架构与网络层设计
description: 序列化协议选型、沙漏架构、KCP 双通道、前后端同构与 ECS 管线化设计的完整推演
category: tech
date: 2026-07-08
---

# TypeScript 高性能游戏架构与网络层设计

## 1. 序列化协议选型 (Protobuf vs MessagePack)

在游戏协议选型中，没有绝对的银弹，需根据场景分频处理：

* **MessagePack**：适用于全栈 TypeScript 项目、业务系统（如背包、邮件）。优势在于**零编译成本**，天然契合动态数据，与 TS 接口无缝集成。
* **Protobuf**：适用于跨语言微服务、帧同步指令。优势在于**极致压缩率**和**强契约约束**，但存在对象实例化带来的轻微性能（GC）开销。
* **FlatBuffers / 自定义二进制**：专为横版动作等 **60Hz 高频战斗** 准备。优势在于**零拷贝（Zero-copy）**，直接读取内存偏移，彻底消除序列化带来的 GC 掉帧问题。

## 2. 协议解耦与代码生成 (Hourglass Architecture)

为了让业务层彻底摆脱底层网络协议的束缚，推荐使用"沙漏架构"：

* **核心思想**：业务层只依赖纯粹的 DTO（Plain Object），网络层无论收发什么协议，最终都转换为同一套 DTO。
* **自动化落地**：通过 YAML 定义协议描述文件，利用 Node.js + EJS 模板引擎编写代码生成器（Code Generator）。
* **一键生成产物**：
1. 前后端通用的 TypeScript / Go 数据接口。
2. 针对 Protobuf / MessagePack 的双向适配器（Adapter）。
3. MsgID 到数据类型的路由分发器（Dispatcher）。


* **高频优化**：针对 Protobuf 的对象生成开销，可在生成的适配器中引入对象池（Object Pool）**或生成**直读内存视图（Data View）来实现零 GC。

## 3. 传输层接入 (KCP & 双通道网络)

将解耦的 DTO 架构与底层的网络传输层对接：

* **KCP 集成**：KCP 牺牲少量带宽换取低延迟（无延迟模式）。配合自定义极简包头（`Length(2) + MsgID(2)`），解决 UDP 模拟流式传输带来的拆包与粘包问题。
* **双通道架构**：
* **UDP / KCP**：承载高频移动、攻击指令（允许极少丢包或靠 KCP 重传）。
* **TCP / WebSocket**：承载登录、支付、聊天等对时序和可靠性要求绝对严苛的慢逻辑。
* 业务逻辑层对此透明，统一通过 `EventBus.on(MsgID)` 监听数据。



## 4. 前后端同构与透明网络层 (Isomorphic Architecture)

实现"单机/联机随时切换"、"前后端共用一套逻辑"的顶级架构：

* **抽象管道 (`ITransport`)**：业务逻辑不能直接调用 WebSocket 或 KCP，而是对 `ITransport` 接口编程。
* **单机/开发模式**：注入 `MemoryTransport`，在同一进程内通过深拷贝（打断引用）模拟网络延时和数据收发。
* **联机/分离模式**：注入 `KcpTransport`，真正走底层网络模块。
* **工程禁忌**：严格禁止单例模式混用与时间轴混用，必须明确拆分 `ClientWorld` 和 `ServerWorld` 上下文。

## 5. 战斗系统范式：放弃 OOP，拥抱 ECS

在同构且需要频繁网络序列化的架构中，面向对象（OOP）是噩梦，面向数据（Data-Oriented）与纯函数（Functional）是唯一解。

* **为什么不用 OOP**：数据与方法耦合，包含原型链，极难做网络序列化传递，且做状态快照（Snapshot）和预测回滚成本极高。
* **ECS (Entity Component System) 的优势**：
* **实体 (Entity)**：只是一个 ID。
* **组件 (Component)**：也就是生成的纯数据 DTO。
* **系统 (System)**：全是纯函数，接收数据输入，产出数据变更。


* **完美契合网络**：整个游戏世界的状态就是一个大的扁平字典，做一帧的全量快照只需一次轻量的深拷贝或序列化，无缝适配网络同步机制。

## 6. 优雅落地 ECS 的工业级规范

为避免 ECS 架构后期沦为逻辑散落一地的"杂乱面条代码"，需遵循以下规范：

1. **管线化 (Pipeline)**：打破神级系统，将复杂逻辑拆分为单一职责的微小系统（如：算伤系统 $\rightarrow$ 扣血系统 $\rightarrow$ 死亡系统），按严格顺序执行。
2. **事件组件化 (Event Components)**：用"存活仅一帧的组件"代替传统的 EventBus 派发机制，保持数据查询的纯粹性。
3. **工厂模式 (Factory)**：将繁琐的 `addComponent` 组装过程封装在工厂函数中，提供类似于 OOP 实例化的优雅调用。
4. **上下文隔离 (World Resources)**：地图网格、全局配置表、DeltaTime 等非实体依赖，通过 `World.setResource()` 注入，实现优雅的纯函数依赖注入。

在 ECS 架构中，"管线化"（Pipeline）是解决代码杂乱、防止系统（System）无限膨胀的最核心手段。

你可以把它想象成现代汽车制造的**工业流水线**。在流水线上，没有一个工人会从头到尾造一辆车；而是第一个人只负责装底盘，然后履带把车传给第二个人装引擎。

在游戏逻辑中，管线化就是**严苛地控制每个 System 的职责边界，让它们通过"数据（组件）"作为履带，按固定顺序串联执行**。

我们以最复杂的"战斗伤害结算"为例，详细拆解管线化的设计。

---

## 灾难现场：未管线化的"神级系统"

初学者写 ECS，很容易把面向对象的习惯带进来，写出一个什么都干的 `CombatSystem`：

```typescript
// ❌ 错误示范：大包大揽的 God System
class CombatSystem {
    static update(world: World) {
        const events = world.query(['AttackInput']);
        for (const e of events) {
            // 1. 算基础伤害
            let damage = calculateBaseDamage(e);
            
            // 2. 算护甲减免
            const armor = world.getComponent(e.target, 'Armor');
            damage -= armor.value;

            // 3. 扣血
            const hp = world.getComponent(e.target, 'Health');
            hp.current -= damage;

            // 4. 判死
            if (hp.current <= 0) {
                world.addComponent(e.target, 'Dead', {});
                playDeathAnimation(e.target); // 甚至混入了表现层代码！
            }
        }
    }
}

```

**痛点：**
如果策划明天要求加一个"无敌护盾"机制，后天要求加一个"锁血"机制，你只能在这个巨大的 `for` 循环里不断塞入 `if/else`。最后这个函数会变成几千行无法维护的屎山。

---

## 优雅重构：基于数据的切片管线

管线化的核心原则是：**前一个 System 绝不直接调用后一个 System，它们唯一的交流方式是"往实体上挂载或修改单帧组件（Event Component）"。**

我们将上面的庞大逻辑，切分成 4 个极小的管线节点：

### Step 1: 意图生成 (DamageIntentSystem)

这个系统只关心一件事：谁发起了攻击？生成一个具体的"伤害意图"。

```typescript
// 单帧事件组件，用于在管线中传递数据
interface DamageIntent { amount: number; source: Entity; }

class DamageIntentSystem {
    static update(world: World) {
        // 假设通过碰撞或技能判定，确认命中了
        const hits = world.query(['HitRecord']); 
        for (const hit of hits) {
            const targetId = hit.target;
            // 不扣血！只是在目标身上挂一个"将要受伤"的意图组件
            world.addComponent(targetId, 'DamageIntent', { 
                amount: 100, 
                source: hit.source 
            });
            world.removeComponent(hit, 'HitRecord'); // 清理源事件
        }
    }
}

```

### Step 2: 拦截与修饰 (ShieldSystem / ArmorSystem)

管线最大的优势来了：你可以随意插拔中间件。`ShieldSystem` 只拦截带有 `DamageIntent` 的实体。

```typescript
class ShieldSystem {
    static update(world: World) {
        // 查出所有"身上有护盾"且"正面临伤害意图"的实体
        const entities = world.query(['DamageIntent', 'Shield']);
        for (const entity of entities) {
            const intent = world.getComponent<DamageIntent>(entity, 'DamageIntent')!;
            const shield = world.getComponent<Shield>(entity, 'Shield')!;
            
            // 护盾抵消伤害
            const absorb = Math.min(intent.amount, shield.value);
            intent.amount -= absorb;
            shield.value -= absorb;
            
            if (shield.value <= 0) {
                world.removeComponent(entity, 'Shield'); // 盾破了
            }
        }
    }
}

```

### Step 3: 数据结算 (HealthApplySystem)

经过前面的层层拦截，伤害意图已经是最终值了，现在才真正修改血量。

```typescript
class HealthApplySystem {
    static update(world: World) {
        const entities = world.query(['DamageIntent', 'Health']);
        for (const entity of entities) {
            const intent = world.getComponent<DamageIntent>(entity, 'DamageIntent')!;
            const hp = world.getComponent<Health>(entity, 'Health')!;
            
            if (intent.amount > 0) {
                hp.current = Math.max(0, hp.current - intent.amount);
            }
            
            // 【核心】销毁意图组件，本帧伤害结算结束！
            world.removeComponent(entity, 'DamageIntent'); 
        }
    }
}

```

### Step 4: 后置反应 (DeathSystem)

独立出来，专门处理结果。

```typescript
class DeathSystem {
    static update(world: World) {
        const entities = world.query(['Health']);
        for (const entity of entities) {
            const hp = world.getComponent<Health>(entity, 'Health')!;
            if (hp.current <= 0 && !world.getComponent(entity, 'Dead')) {
                // 打上死亡标签，供后续的掉落系统、清理系统使用
                world.addComponent(entity, 'Dead', {});
            }
        }
    }
}

```

---

## 管线组装：高度确定性的 Main Loop

在你的主循环中，所谓的管线化，最终就体现为一个**严格有序的函数调用数组**。

```typescript
// 游戏主循环 / Tick
function gameTick(world: World) {
    // --- 1. 意图阶段 ---
    InputSystem.update(world);
    DamageIntentSystem.update(world);

    // --- 2. 拦截与修饰阶段 (随时可以注释掉某一行来屏蔽机制) ---
    InvincibleCheatSystem.update(world); // 比如外挂无敌模式：直接清空 DamageIntent
    ShieldSystem.update(world);
    ArmorSystem.update(world);

    // --- 3. 结算阶段 ---
    HealthApplySystem.update(world);
    MovementSystem.update(world);

    // --- 4. 状态机与回收阶段 ---
    DeathSystem.update(world);
    CorpseCleanupSystem.update(world);
}

```

## 管线化带来的质变

1. **绝对的可测试性（TDD 友好）：**
你想测试"护盾机制"是否生效？不需要创建一个复杂的完整游戏场景。只需给一个空 Entity 挂上 `Health`、`Shield` 和 `DamageIntent`，然后单调一次 `ShieldSystem.update`，断言意图的数值是否减少即可。
2. **策划需求的完美隔离：**
如果策划要求加一个"春哥甲（死亡后复活并满血）"的装备。你不需要动上面的任何一行代码，只需要写一个 `ReviveSystem`，插在 `DeathSystem` 后面，拦截带有 `Dead` 和 `ReviveItem` 组件的实体，移除 `Dead` 组件，加满血即可。逻辑完全解耦。

---

## 数组化管线：System Dispatcher

将所有 System 放进一个数组（`[]`）中循环执行，在架构设计中通常被称为 **System Dispatcher（系统调度器）** 或 **Pipeline Manager（管线管理器）**。

这种做法不仅让代码更明确，而且将"控制流"变成了"数据"，带来了极大的架构弹性。

### 极简实现

首先，给所有系统定义一个统一的契约（接口）：

```typescript
// 统一的系统接口
export interface ISystem {
    update(world: World, deltaTime: number): void;
}

```

然后，实现一个管线管理器，本质上就是一个包装了数组的类：

```typescript
export class Pipeline {
    private systems: ISystem[] = [];

    // 支持链式调用，方便拔插
    public add(system: ISystem): Pipeline {
        this.systems.push(system);
        return this;
    }

    // 从管线中拔出系统
    public remove(systemClass: any): void {
        this.systems = this.systems.filter(s => !(s instanceof systemClass));
    }

    // 核心：无脑循环执行
    public tick(world: World, deltaTime: number): void {
        for (const system of this.systems) {
            system.update(world, deltaTime);
        }
    }
}

```

### 极致优雅的组装与执行

```typescript
// 1. 组装管线 (按严格的先后顺序 push 进数组)
const battlePipeline = new Pipeline()
    .add(new InputSystem())
    .add(new DamageIntentSystem())
    .add(new ShieldSystem())
    .add(new HealthApplySystem())
    .add(new DeathSystem())
    .add(new CorpseCleanupSystem());

// 2. 游戏主循环
function gameLoop(dt: number) {
    // 只需要这一行，数组会自动按序遍历执行
    battlePipeline.tick(world, dt);
}

```

---

## 数组化带来的三大高级红利

将系统放进 `[]` 循环执行，不仅仅是代码好看，它直接解决了前后端分离和动态调试的痛点：

### 红利一：运行时动态拔插 (Runtime Toggling)

如果是传统的硬编码函数调用，遇到策划要求"做一个没有护盾的特殊关卡"，你需要在逻辑里写 `if (!isSpecialStage)`。
有了数组管线，你只需要在进入关卡前，把 `ShieldSystem` 从数组里 `remove` 掉即可，逻辑代码零修改。

### 红利二：完美的前后端同构复用

在"前后端一体化"架构中，前端和后端的逻辑几乎一样，唯一的区别是前端需要"渲染画面"和"播放声音"，而后端不需要。
通过数组，你可以轻松实现差异化组装：

```typescript
// 基础逻辑管线（前后端共用）
const corePipeline = new Pipeline()
    .add(new MovementSystem())
    .add(new CombatSystem());

// 服务端启动：只跑核心逻辑
const serverPipeline = corePipeline;

// 客户端启动：在核心逻辑后面，动态"插"入表现层系统
const clientPipeline = corePipeline
    .add(new ParticleFxSystem())   // 粒子特效系统
    .add(new SpriteRenderSystem()) // 画面渲染系统
    .add(new AudioSystem());       // 音效播放系统

```

### 红利三：数据驱动的管线组装

因为管线已经变成了数组，你甚至可以完全不写 TypeScript 组装代码。你可以通过读取一个 JSON 或 YAML 配置表，通过字符串反射来 `push` 对应的 System 实例。这就彻底实现了"数据驱动开发"。

---

## 反馈环问题：连锁反应如何处理

在经典的单向管线（Pipeline）设计中，这被称为"反馈环（Feedback Loop）"或"级联事件（Cascading Events）"问题。

举个最常见的游戏场景：
管线顺序是 `伤害计算 -> 扣血 -> 死亡判定`。
但在`死亡判定`系统中，某个怪物触发了"自爆"被动技能。这就要求产生新的伤害，也就意味着**需要回头去调度已经执行过的"伤害计算"系统**。

在 ECS 架构中，**绝对禁止系统 A 直接回头去调用系统 B（打破单向数据流）**。一旦你这么做了，管线就会退化回面条代码。

解决这个问题，业界有三种标准的优雅方案：

### 方案一：延迟到下一帧（Defer to Next Frame）-- 90% 的首选方案

这是 ECS 最核心的哲学：**让子弹飞一帧。**

当后续管线（DeathSystem）产生了需要前置管线（DamageSystem）处理的数据时，**不要试图在当前帧强行回头执行，而是抛出一个事件组件，把它留在 World 里。** 当游戏主循环跑到下一帧的开头时，前置管线自然会消费到这个事件。

```typescript
class DeathSystem {
    update(world: World) {
        const deadEntities = world.query(['Health']);
        for (const e of deadEntities) {
            if (hp <= 0) {
                // 怪物死亡，触发自爆！
                // 不回头调 DamageSystem，而是生成一个"爆炸范围伤害"事件扔进世界
                world.queueInputEvent('AreaDamageEvent', { center: pos, radius: 5, amount: 200 });
                world.addComponent(e, 'Dead', {});
            }
        }
    }
}

```

**为什么这是首选？**
在 60Hz（16ms一帧）甚至 30Hz（33ms一帧）的循环中，**人类根本无法察觉这 1 帧的延迟**。怪物死亡，下一帧周围的怪才扣血，在玩家眼里这完全是同时发生的。这种做法让管线永远保持严格的从上到下单向流动，没有任何死循环风险。

---

### 方案二：局部微循环（Multi-pass Execution）-- 必须同帧解决时

某些特殊逻辑**绝对不能跨帧**。比如《消消乐》的连锁反应，或者复杂的物理碰撞，如果你分好几帧处理，玩家会看到物体发生穿模。

解法是：在主循环中，对这几个**存在循环依赖的 System，使用 `while` 循环包起来，直到没有事件产生为止。**

```typescript
function gameTick(world: World, dt: number) {
    // 1. 输入管线（只执行一次）
    InputSystem.update(world);

    // 2. 战斗与反应管线（局部微循环）
    let cascadeLimit = 5; 
    
    while (world.hasComponent('DamageIntent') && cascadeLimit > 0) {
        DamageIntentSystem.update(world);
        ShieldSystem.update(world);
        HealthApplySystem.update(world);
        DeathSystem.update(world); // 如果死亡引发了新的 DamageIntent，while 会再跑一圈！
        
        cascadeLimit--;
    }

    if (cascadeLimit === 0) {
        console.warn("发生极深层级的连锁反应，被强行截断！");
    }

    // 3. 最终的清理与渲染管线（只执行一次）
    CorpseCleanupSystem.update(world);
    RenderSystem.update(world);
}

```

**优势：** 既保证了逻辑在同一帧内彻底结算完毕，又没有打破 System 之间通过数据解耦的原则。

---

### 方案三：管线重排与职责合并（Reordering / Merging）

当你发现经常需要"后置系统调度前置系统"时，很多时候是因为**你的管线顺序排错了，或者系统拆得太碎了**。

**反面教材：**
你把 `Buff倒计时系统` 放在了 `伤害结算系统` 的后面。导致持续掉血 Buff 触发时，你不得不回头去找伤害结算系统。
**解法：**
将 `Buff倒计时系统` 提前。在 ECS 中，数据生产方永远应该在数据消费方的前面。

**反面教材 2（过度设计）：**
你把物理的 `X轴移动系统` 和 `Y轴移动系统` 拆成了两个。结果 Y 轴碰壁反弹，影响了 X 轴的摩擦力计算，导致频繁互相依赖。
**解法：**
内聚性极高的紧密逻辑，不要硬拆。合并成一个 `PhysicsMovementSystem`。

---

### 决策流程

当你遇到"回头调度"的需求时，按以下顺序问自己：

1. **"晚 1 帧（16ms）处理，玩家能看出来吗？"**
如果看不出来（绝大多数战斗技能、Buff、状态机切换都是如此） $\rightarrow$ **果断用方案一（抛出事件，等下一帧处理）。**
2. **"如果不立刻处理，下一段逻辑会拿错数据吗？"**
比如物理碰撞、多次连击的瞬时结算 $\rightarrow$ **用方案二（在管线内部加一个 while 微循环）。**
3. **"是不是每次都要回头调？"**
如果是 $\rightarrow$ **用方案三（重新审视你的管线节点顺序，把生产数据的系统移到前面）。**

---

## 反击系统：拦截而非打断

在传统的 OOP 或基于事件（EventEmitter）的架构中，反击是一种"控制流的打断"。

但在纯正的 ECS 管线化架构中，**管线本身的执行永远不会被打断**。我们不打断控制流，而是"拦截并篡改流动中的数据"。

### 管线推演

假设场景：玩家 A 对 玩家 B 发起了攻击，但 玩家 B 身上带有 `CounterStance`（反击姿态）组件。

| 管线节点 | 执行逻辑 | A 的状态 | B 的状态 |
| --- | --- | --- | --- |
| **1. 攻击判定系统** | A 的武器碰到了 B，给 B 挂上受击意图。 | 正在攻击 | 贴上 `DamageIntent(来源:A)` |
| **2. 反击系统 (拦截!)** | 发现 B 同时拥有 `CounterStance` 和 `DamageIntent`。消除伤害（撕掉 B 的 `DamageIntent`），反向攻击（给 A 贴上 `DamageIntent(来源:B)`），打断动作（给 A 贴上 `Stun`）。 | 贴上 `DamageIntent`、`Stun` | 撕下 `DamageIntent`、保留 `CounterStance` |
| **3. 扣血系统** | 挨个找谁身上有 `DamageIntent`，然后扣血。 | 被扣血 | 安全无事 |
| **4. 状态机系统** | 挨个找谁身上有 `Stun`，清除其攻击状态。 | 攻击被强行中断 | 安全无事 |

### 架构优势

1. **逻辑自洽，没有"回调地狱"**：不需要在 A 的攻击代码里写 `if (B.hasCounter)`。A 只管生成 `DamageIntent`，后续的 `CounterAttackSystem` 像过滤器一样默默处理。
2. **多重机制完美兼容**：如果攻击是"不可反击的重击"，只需在 `DamageIntent` 上加字段 `canBeCountered: false`，`CounterAttackSystem` 读到后直接跳过。
3. **天然支持"连环反击"**：利用局部微循环，把 `CounterAttackSystem` 放在 `while` 循环里，直到没有人再产生新的 `DamageIntent` 为止。

> **核心哲学：** 在 ECS 中，**"打断"从来都不是一个动词，而是一个数据状态**。我们不去"打断"正在施法的 A，而是给 A 贴上一个名为 `InterruptEvent` 的标签。下一个专门负责状态管理的系统看到了这个标签，自然会把 A 的"正在施法"标签撕掉。**管线永远在平稳运行，变化的是履带上的零件。**

---

## 世代隔离：微循环的终极安全方案

在使用 `while` 微循环处理"同帧级联事件"时，如果系统忘记移除组件，`while` 循环就会成为**真·死循环**。

### 终极解法：世代隔离 (Generation Token)

核心思想：**这一圈产生的意图，只能在下一圈被处理；且每个意图只能被处理一次。**

```typescript
// 1. 给每个意图加上"世代"标记
interface DamageIntent {
    amount: number;
    type: DamageType;
    generation: number; // 记录它是在第几次循环产生的
}

function combatMicroLoop(world: World) {
    let currentGeneration = 0;
    let cascadeLimit = 5;
    
    while (world.hasComponentOfTypeAndGeneration('DamageIntent', currentGeneration) && cascadeLimit > 0) {
        
        ReflectSystem.update(world, currentGeneration); 
        HealthApplySystem.update(world, currentGeneration);
        DeathSystem.update(world, currentGeneration + 1); // 新意图世代 +1
        
        // 强制清理安全网：哪怕系统漏删，这里也能保底清理
        world.removeAllComponentsOfTypeAndGeneration('DamageIntent', currentGeneration);

        currentGeneration++;
        cascadeLimit--;
    }

    if (cascadeLimit === 0) {
        console.error(`战斗结算触及级联上限 (limit=5)，被强行截断！`);
    }
}

```

**为什么世代隔离是终极形态？**
1. **绝对防死锁**：每一圈结束都有兜底的强制清理，任何意图的生命周期绝对不超过一圈。
2. **逻辑可控**：连环反应随着 `currentGeneration` 递增，像水波纹一样扩散，可清晰调试。
3. **符合游戏直觉**：就算被 `cascadeLimit` 截断，对游戏逻辑也可接受（防止同屏瞬间产生过多计算）。

> **铁律：在 ECS 中使用 `while` 处理连锁反应时，不要信任业务代码能完美终结循环。必须在架构层面上给事件组件加上生命周期标记（Generation），并在每一圈结束时进行强制垃圾回收（Sweep）。**

---

## 战斗结算时序：受击前与受击后

核心思路是：**将原本的一个"受击事件"，拆分成一个多阶段的生命周期状态（Lifecycle States），并通过不同的 System 来推进这个状态。**

### 事件拆分为多阶段状态

1. **`DamageProposal` (伤害提案)**：最初的意图，还没经过任何减免和拦截。
2. **`DamageConfirmed` (已确认伤害)**：经过了护盾、闪避等判定后，最终确定要扣除的数值。
3. **`DamageResult` (伤害结果)**：扣血操作已完成，用于触发后续反应（如吸血、反伤）。

### 管线设计

```typescript
function combatPipeline(world: World) {
    // 阶段 1：提案阶段 - 产生原始伤害意图
    HitDetectionSystem.update(world); 

    // 阶段 2：受到伤害前 (Pre-Damage) - 拦截、减免、判定
    EvasionSystem.update(world);      // 闪避判定
    ShieldSystem.update(world);       // 护盾抵扣
    InvincibilitySystem.update(world);// 无敌判定
    ProposalToConfirmedSystem.update(world); // 推进状态

    // 阶段 3：结算阶段 - 真正扣血
    HealthApplySystem.update(world);

    // 阶段 4：受到伤害后 (Post-Damage) - 触发被动反应
    LifestealSystem.update(world);    // 吸血
    ReflectDamageSystem.update(world);// 反伤
    RageIncreaseSystem.update(world); // 增加怒气

    // 阶段 5：清理阶段
    CleanupDamageResultsSystem.update(world);
}

```

### 数据流即控制流

* **受击前（Pre-Damage）** $\rightarrow$ 围绕 `DamageProposal` 做文章，系统可任意修改数值，甚至直接销毁它（闪避成功）。
* **执行结算（Apply）** $\rightarrow$ 将 `DamageProposal` 转为 `DamageConfirmed`，实际扣除 `Health` 的值。
* **受击后（Post-Damage）** $\rightarrow$ 基于实际扣除的血量生成 `DamageResult` 组件，触发后续特效、音效或反击逻辑，最后清理。

这种"状态流转"设计彻底消灭了回调地狱，而且让整个战斗流程极具**可测试性**和**扩展性**--无论策划想在哪个阶段插入多么奇怪的技能机制，都只需写一个新的 System，放到管线的对应位置即可。
