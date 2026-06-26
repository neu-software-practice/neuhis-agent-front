### 一、 核心业务逻辑解析 (Markdown 结构化)

**1. 主流程 (Main Flow)**

- **对话开始·AI问诊**：患者录入症状，与AI进行自由对话。
- **卡：是否检验？**（阻塞决策，可否决）：AI判断是否需要医学检验。
  - *同意检验* -> 进入缴费。
  - *不查* -> 直接跳至“确诊卡”。
  - *否决机制* -> 暂不决定，解锁对话继续聊，稍后重新给出此卡。
- **卡：缴费(检验费)**（阻塞决策，可否决）：支付费用，检验结果回填后继续。
- **确诊卡**：AI 结合问诊和检验结果给出诊断及依据。
- **AI 处置决策(大模型)**：后台大模型决定后续方案（用药/治疗/医嘱/转大医院）。
- **处置执行卡**：根据决策执行对应分支（如：用药分支包含药品缴费、取药方式、用药提醒）。
- **就诊结束·完成卡**：流程走完，但底部输入框依然可用。
  - *不再输入* -> 正常结束。
  - *结束后续输入* -> 触发自动复诊，跳回“是否检验？”环节。

**2. 横切·打断/升级机制 (全局并行)** 这些动作可以在上述主流程的**任意环节**触发：

- **急症守护**：全程监听患者对话，一旦命中急症关键词，立即打断，引导**前往急诊（终止）**。
- **整次导诊超时**：单一总计时的超时限制，一旦超时，或大模型判断“本院不具备”处置条件，则**转大医院（升级终止）**。
- **主动退出**：点击顶栏X触发，确认退出后进行“退出结算”（不可逆），最终**结束/挂起（终止）**。



```mermaid
graph TD
    %% 样式定义
    classDef mainCard fill:#ffffff,stroke:#333,stroke-width:2px,color:#000
    classDef blockCard fill:#ffffff,stroke:#0066cc,stroke-width:3px,color:#000,rx:10,ry:10
    classDef aiDecision fill:#e6e6fa,stroke:#9370db,stroke-width:2px,color:#000,rx:10,ry:10
    classDef interrupt fill:#fff0e6,stroke:#ff8c00,stroke-width:2px,color:#000,rx:10,ry:10
    classDef terminate fill:#fff0e6,stroke:#ff3300,stroke-width:3px,color:#000,rx:20,ry:20
    classDef endNode fill:#e8f5e9,stroke:#4caf50,stroke-width:3px,color:#000,rx:20,ry:20
    classDef subNote fill:#f5f5f5,stroke:#ccc,stroke-width:1px,color:#666

    subgraph 主流程 [主流程卡片流转]
        A["对话开始·AI问诊<br/>症状录入·自由对话"]:::mainCard
        
        B["卡:是否检验?<br/>阻塞决策·可否决"]:::blockCard
        Veto["否决机制<br/>暂不决定 ➔ 解锁对话<br/>继续聊 ➔ 稍后重新出卡"]:::subNote
        
        C["卡:缴费(检验费)<br/>阻塞·可否决"]:::blockCard
        
        D["确诊卡<br/>AI给出诊断+依据"]:::mainCard
        
        E["AI处置决策(大模型)<br/>旁侧按钮模拟·患者不选<br/>用药 / 治疗 / 医嘱 / 转大医院"]:::aiDecision
        
        F["处置执行卡<br/>用药 / 自动化治疗 / 仅医嘱"]:::mainCard
        Med["用药分支<br/>药品缴费 ➔ 取药方式 ➔ 用药提醒"]:::subNote
        
        G["就诊结束·完成卡<br/>输入框仍可用"]:::mainCard
        
        H((("正常结束"))):::endNode
    end

    subgraph 全局并行 [横切·打断/升级 任意环节并行]
        direction TB
        I1["急症守护<br/>全程监听·命中即打断"]:::interrupt
        I2((("前往急诊 - 终止"))):::terminate
        
        J1["整次导诊超时<br/>单一总计时"]:::interrupt
        J2((("转大医院 - 升级终止"))):::terminate
        
        K1["主动退出 - 顶栏 X<br/>任意状态可触发"]:::interrupt
        K2["退出结算<br/>按不可逆动作处理"]:::interrupt
        K3((("结束 / 挂起 - 终止"))):::terminate
    end

    %% 主流程连线
    A --> B
    B -- "同意检验" --> C
    C -- "支付·检验回填" --> D
    D --> E
    E -- "处置已决策" --> F
    F --> G
    G -- "不再输入" --> H

    %% 分支与特殊连线
    B -. "否决 ➔ 继续对话" .-> Veto
    Veto -.-> A
    B == "不查，直接看诊断" ==> D
    E -. "本院不具备处置能力" .-> J2
    F -. "包含" .-> Med
    H == "结束后续输入 ＝ 自动复诊" ==> B

    %% 并行打断连线
    I1 -- "命中" --> I2
    J1 -- "超当时限" --> J2
    K1 -- "确认退出" --> K2 --> K3

    %% 连线样式
    linkStyle 8 stroke:#0066cc,stroke-width:2px,stroke-dasharray: 5 5;
    linkStyle 10 stroke:#4caf50,stroke-width:2px,stroke-dasharray: 5 5;
    linkStyle 11 stroke:#ff8c00,stroke-width:2px,stroke-dasharray: 5 5;
    linkStyle 13 stroke:#4caf50,stroke-width:3px,stroke-dasharray: 5 5;
```

