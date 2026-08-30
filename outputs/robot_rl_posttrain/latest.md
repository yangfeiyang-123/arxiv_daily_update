# Robot Manipulation RL Post-Training Daily Watch · 2026-08-29

> 本次发现 **93** 篇此前从未推送的新论文。
> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。

## 1. WCM: A World Critic Model for Vision-Language-Action Reinforcement Learning

- **arXiv**: [2607.29613](https://arxiv.org/abs/2607.29613v1) · [PDF](https://arxiv.org/pdf/2607.29613v1)
- **日期**: 2026-07-31 · **相关度**: 45
- **作者**: Senyu Fei, Xiaopeng Yu, Siyin Wang, Xianzhong Zhao, Jingjing Gong, Xipeng Qiu
- **标签**: VLA · Online RL · Offline RL · Value/Q · Real robot · Model-based
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；与 RL-100 相近：采用 offline-to-online 数据飞轮；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Reinforcement learning (RL) post-training of Vision-Language-Action (VLA) models has shown strong promise for robotic manipulation. Among RL methods, critic-based approaches rely on a value estimator that predominantly operates on single-frame observations or single-frame VLM backbone latents, which is a fundamental mismatch with the partially observable nature of robot control. A naive approach to incorporate observation history into the critic incurs exponential complexity with high-dimensional visual space, and still fails because pure scalar-return regression provides insufficient supervision for learning cross-temporal dynamics. We identify the root cause as a state approximation…

## 2. Foresight Residual RL for Long-Horizon Robot Manipulation with Vision-Language-Action Models

- **arXiv**: [2607.16506](https://arxiv.org/abs/2607.16506v1) · [PDF](https://arxiv.org/pdf/2607.16506v1)
- **日期**: 2026-07-17 · **相关度**: 42
- **作者**: Yuhan Liu, Xinyu Zhang, Litao Liu, Abdeslam Boularias
- **标签**: VLA · Residual/Edit · Dexterity/Tactile
- **与主线的关系**: 与 DICE 相近：在冻结/受约束的行为先验旁学习残差或编辑策略；直接面向 VLA/机器人基础策略的后训练；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Vision-Language-Action (VLA) policies offer strong general-purpose manipulation priors, but often fail on tight-tolerance, contact-rich assembly due to long-horizon credit assignment and subtask coupling: a state that is geometrically successful for the current skill can be brittle for downstream skills. We show this failure mode in residual reinforcement learning (RL) over a frozen VLA base policy: constant sparse success rewards improve each subtask in isolation yet yield little or no gain when skills are chained, because terminal state quality is uncontrolled. We propose Foresight Residual RL, which optimizes handoff quality by augmenting each subtask's sparse success reward with an…

## 3. In-Context VLA: Endowing Vision-Language-Action Models with Language via In-Context Post-Training and Agentic Tool Use

- **arXiv**: [2608.05738](https://arxiv.org/abs/2608.05738v1) · [PDF](https://arxiv.org/pdf/2608.05738v1)
- **日期**: 2026-08-06 · **相关度**: 41
- **作者**: Jiarui Yang, Wen Huang, Jiale Zhang, Maowei Hu, Hang Guo
- **标签**: VLA · Real robot · Latency
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Vision-Language-Action (VLA) models have become the dominant recipe for generalist manipulation, yet they are almost universally trained by behavior cloning: a policy imitates expert action chunks conditioned on a static image and a fixed instruction. A natural remedy is to inject explicit reasoning through textual chain-of-thought (CoT). We show, both empirically and analytically, that free-form textual CoT degrades low-level control: the reasoning it produces is ungrounded, its latency breaks closed-loop timing, and, crucially, the reasoning and action tokens are optimized against conflicting objectives so that the policy learns to narrate rather than to act. We argue that what a VLA…

## 4. Beyond Flat Policies: Hierarchical Post-Training for Embodied Agents in Robotic Manipulation

- **arXiv**: [2608.05999](https://arxiv.org/abs/2608.05999v1) · [PDF](https://arxiv.org/pdf/2608.05999v1)
- **日期**: 2026-08-06 · **相关度**: 38
- **作者**: He Kong, Zengjue Chen, Qi Wang, Qianli Xing, Runliang Niu, Peidong Liu, Jiawei Li, Shiqi Wang, et al.
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models have demonstrated remarkable capabilities in robotic manipulation by leveraging pretrained vision-language models. However, existing post-training methods predominantly optimize VLA models as flat policies, making it difficult to explicitly model task progression and perform robust long-horizon manipulation. Although hierarchical approaches introduce task decomposition, they mainly rely on supervised learning from offline demonstrations and cannot effectively improve execution through online interaction. To address this limitation, we propose Hierarchical Robotic Control (HiRoC), a hierarchical post-training framework that decouples high-level task…

## 5. HAF: Adapting Generalist VLAs to Humanoid Whole-Body Loco-manipulation via Hierarchical Action Flow and Spectral Latent RL

- **arXiv**: [2608.16837](https://arxiv.org/abs/2608.16837v1) · [PDF](https://arxiv.org/pdf/2608.16837v1)
- **日期**: 2026-08-17 · **相关度**: 37
- **作者**: Langzhe Gu, Chengkai Hou, Meng Li, Xinhua Wang, Jiaming Liu, Xinyuan Lv, Bowei Zhang, Shuanghao Bai, et al.
- **标签**: VLA · Online RL · Real robot
- **与主线的关系**: 关注真实或仿真在线交互后的策略提升；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Humanoid robots hold great promise as general-purpose agents in human-centered environments, yet generalist vision-language-action (VLA) foundation models are not readily applicable to humanoid whole-body loco-manipulation. The high dimensionality and interdependence of humanoid motions make it challenging for conventional single-stage VLA architectures to coordinate locomotion, waist posture, and dual-arm manipulation effectively. Moreover, policies trained through offline behavior cloning can remain suboptimal during real-world deployment. Although online reinforcement learning can refine policies through real-world interaction, directly tuning large VLA backbones demands excessive…

## 6. Robo-Dopamine 2.0: History-Conditioned and OOD-Aware Process Reward Modeling for Robotic Manipulation

- **arXiv**: [2608.15680](https://arxiv.org/abs/2608.15680v1) · [PDF](https://arxiv.org/pdf/2608.15680v1)
- **日期**: 2026-08-16 · **相关度**: 37
- **作者**: Yijie Xu, Haopeng Jin, Run Zhou, Shengbang Liu, Sixiang Chen, Hongyang Cheng, Sicheng Hu, Peterson Co, et al.
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models improve robotic manipulation but remain vulnerable to compounding errors, scene changes, and off-trajectory states. Reinforcement learning can refine pretrained VLA policies, yet sparse success signals hinder exploration, while engineered dense rewards are costly and task-specific. Existing learned visual reward models often rely on static before-after observations, causing temporal ambiguity and weak discrimination between robustness-preserving variations and task-invalid failures under out-of-distribution (OOD) execution. We introduce Robo-Dopamine 2.0, a history- and OOD-aware process reward model with a pairwise prediction interface. It combines (1)…

## 7. Look Where It Matters: Adaptive Visual Refinement for Vision-Language-Action Models

- **arXiv**: [2608.02197](https://arxiv.org/abs/2608.02197v1) · [PDF](https://arxiv.org/pdf/2608.02197v1)
- **日期**: 2026-08-03 · **相关度**: 37
- **作者**: Jin Cui, Yanbin Hu, Xinyue Long, Linkai Li, Boran Zhao, Pengju Ren
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Visual representations of VLA models remain unreliable for spatially precise robotic manipulation. We uncover that vision encoders in VLAs also exhibit attention artifacts previously documented in generic Vision Transformers, and further show that, in embodied policies, these artifacts are closely associated with spatial perception capabilities acquired during post-training. As the encoder learns task-relevant information such as object location, depth ordering, and local geometry, limited global-token capacity causes part of this information to spill into low-information patch tokens. We introduce AtVLA, a framework that inserts learnable register tokens into the visual encoder. Trained…

## 8. RedFlow: Redirect Failure into Action-Level Corrections for Flow-matching VLA Policy

- **arXiv**: [2607.27782](https://arxiv.org/abs/2607.27782v1) · [PDF](https://arxiv.org/pdf/2607.27782v1)
- **日期**: 2026-07-30 · **相关度**: 37
- **作者**: Zhengyang Yan, Junhao Li, Fangqi Zhu, Zijun Wang, Quanxin Shou, Yikun Miao, Xiaoyi Pang, Zicong Hong, et al.
- **标签**: VLA · Online RL · Offline RL · Real robot
- **与主线的关系**: 与 RL-100 相近：采用 offline-to-online 数据飞轮；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Flow-matching Vision-Language-Action (VLA) policies have shown strong potential for robotic manipulation but often suffer from compounding errors caused by distribution shifts during deployment. While offline reinforcement learning (RL) provides a practical way to improve deployed policies using rollout data, existing methods either ignore failure data or exploit it only at the trajectory level, resulting in low learning efficiency and persistent errors. We propose **RedFlow**, a fine-grained offline RL framework that redirects failure experiences into action-level corrective supervision for flow-matching VLA policies. RedFlow consists of two key components: (1) a **Context-Aware…

## 9. Prism-GRPO: Faster VLA Policy Optimization via Splitting Same-outcome Groups

- **arXiv**: [2608.17423](https://arxiv.org/abs/2608.17423v1) · [PDF](https://arxiv.org/pdf/2608.17423v1)
- **日期**: 2026-08-18 · **相关度**: 34
- **作者**: Zeyun Deng, Yuzhe Lu, Yawei Wang, Linbo Liu, Qing Ping, Han Ding, Guande Wu, Panpan Xu, et al.
- **标签**: VLA · Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: GRPO is increasingly used for reinforcement learning of vision-language-action (VLA) policies because, unlike PPO, it does not require training a critic. This simplification comes with a sampling cost: group-relative advantages require multiple rollouts from each scene. Under binary success rewards, groups whose rollouts all succeed or all fail have zero advantage and are discarded by dynamic sampling. These groups are especially common early in training, when most rollouts fail, wasting much of the expensive robotic rollout budget. We introduce Prism-GRPO, which augments binary outcome reward with a weighted trajectory-level execution-quality score. By splitting same-outcome groups into a…

## 10. Addressing the Orchestration Gap in Generalist Robots via Physical Agency

- **arXiv**: [2607.21725](https://arxiv.org/abs/2607.21725v1) · [PDF](https://arxiv.org/pdf/2607.21725v1)
- **日期**: 2026-07-23 · **相关度**: 33
- **作者**: Liane Galanti, Dhruv Shah, Tri Dao
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: General-purpose robots need to reason about their actions, combining perception, world knowledge, planning, success detection, recovery, and low-level control. Today's state-of-the-art models attempt to combine all these capabilities into the learned policy via large-scale pre-training. Instead, we show that these capabilities can be decomposed into a general language-conditioned policy/control agent and a high-level agent manager/orchestrator. Rather than training policies to reason via pre-training, we build a closed-loop physical agent orchestrator that can do high-level planning, decompose the goal into achievable subgoals, command low-level motor commands, track and verify the outcome…

## 11. RoboBRIDGE: A Modular Framework for Bridging Policies to Robust Real-World Robotic Agents

- **arXiv**: [2607.27881](https://arxiv.org/abs/2607.27881v1) · [PDF](https://arxiv.org/pdf/2607.27881v1)
- **日期**: 2026-07-30 · **相关度**: 32
- **作者**: Sihyung Yoon, Minjong Yoo, Sanghyun Ahn, Seojeong Choi, Honguk Woo
- **标签**: VLA · Value/Q · Real robot · Latency
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Vision-Language-Action (VLA) models have attracted growing interest as a scalable approach to robotic manipulation. While these models are effective action predictors, deploying them as robotic agents exposes critical gaps: no mechanism for failure recovery, inconsistent execution over long horizons, and limited robustness to shifts in observations, tasks, or embodiments. Existing solutions address these limitations individually through model retraining or environment-specific modules, yet what is needed is a general framework that systematically transforms a pretrained VLA into a robotic agent. We present RoboBRIDGE, a modular framework that provides an orchestration layer over five…

## 12. Explicit Kinematic Guidance from Analytic Concepts for Vision-Language-Action Models

- **arXiv**: [2607.26513](https://arxiv.org/abs/2607.26513v1) · [PDF](https://arxiv.org/pdf/2607.26513v1)
- **日期**: 2026-07-29 · **相关度**: 32
- **作者**: Mingyang Sun, Jiude Wei, Xiujian Liang, Qichen He, Donglin Wang, Cewu Lu, Jianhua Sun
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Current Vision-Language-Action (VLA) models rely mainly on 2D inputs, neglecting the rich object structural information and commonsense knowledge inherent in the 3D physical world. This deficiency restricts their spatial awareness and adaptability for complex, high-precision manipulation. To bridge this crucial gap, we construct a Concept Expert module for VLA to build executable Analytic Concepts that represent objects as explicit, programmatic blueprints. Our mechanism operates in two synergistic phases: First, prior to VLA inference, the Concept Expert leverages 3D information from Vision Foundation Models (VFMs) to estimate the initial kinematic and structural parameters. Second,…

## 13. Temporal GRPO: Beyond Trajectory-Level Credit in Vision-Language-Action Reinforcement Learning

- **arXiv**: [2608.13026](https://arxiv.org/abs/2608.13026v1) · [PDF](https://arxiv.org/pdf/2608.13026v1)
- **日期**: 2026-08-13 · **相关度**: 31
- **作者**: Yao Zhou, Hang Gao, Fengge Wu, Changwen Zheng, Wenwen Qiang
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Outcome-driven reinforcement learning offers a scalable way to post-train vision-language-action (VLA) policies from sparse task-success feedback. In common GRPO-based VLA post-training, one rollout-level advantage is applied to every action in the trajectory. A rollout that completes several valid stages but fails later can therefore penalize the actions that produced its earlier progress. We call this trajectory-level credit aliasing. Temporal GRPO addresses this problem by constructing detectable task stages, aligning each rollout with stage-specific action intervals, and comparing only rollouts that have entered the same stage. The resulting stage advantages are applied to their…

## 14. Continue or Replan? Bernoulli-Continuation Policy Learning for Adaptive Horizon Execution

- **arXiv**: [2608.03483](https://arxiv.org/abs/2608.03483v1) · [PDF](https://arxiv.org/pdf/2608.03483v1)
- **日期**: 2026-08-04 · **相关度**: 31
- **作者**: Weichen Xu, Zhenhua Liu, Lin Luo, Yaobo Liang, Chengtang Yao, Qingyu Mei, Jian Cao, Xixin Cao, et al.
- **标签**: VLA · Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Existing chunk-based Vision-Language-Action (VLA) models execute a fixed number of actions (i.e., execution horizon) before replanning, turning replanning into a task-agnostic periodic schedule that is independent of task progress. As a result, when no replanning boundary falls before a critical manipulation stage, it is executed from a stale chunk rather than a freshly replanned one. To address this limitation, we propose Bernoulli-Continuation Policy (BCP), a lightweight, plug-and-play framework for adaptive horizon execution that keeps the base VLA frozen. Given a fixed-length action chunk, its continuation head decomposes execution-horizon selection into a sequence of…

## 15. Xiaomi-Robotics-1: Scaling Vision-Language-Action Models with over 100K Hours of Real-World Trajectories

- **arXiv**: [2607.15330](https://arxiv.org/abs/2607.15330v2) · [PDF](https://arxiv.org/pdf/2607.15330v2)
- **日期**: 2026-07-16 · **相关度**: 31
- **作者**: Xiaomi Robotics Team, Jun Guo, Piaopiao Jin, Jason Li, Peiyan Li, Yingyan Li, Futeng Liu, Wanli Peng, et al.
- **标签**: VLA · Real robot · Dexterity/Tactile
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: We present Xiaomi-Robotics-1, a foundational vision-language-action (VLA) model capable of (1) following diverse language instructions to perform a wide range of mobile manipulation tasks in unseen environments out-of-the-box, and (2) efficiently adapting to novel downstream tasks with minimal fine-tuning data. We propose a two-stage training recipe consisting of pre-training and post-training. During pre-training, we imbue the model with broad and generalizable action-generation capabilities by training on over 100k hours of real-world manipulation trajectories collected via UMI devices. Crucially, we develop a scalable auto-labeling pipeline that annotates trajectory clips with natural…

## 16. Hierarchical Skill Retrieval for Data-Efficient Adaptation of Vision-Language-Action Models

- **arXiv**: [2608.24042](https://arxiv.org/abs/2608.24042v1) · [PDF](https://arxiv.org/pdf/2608.24042v1)
- **日期**: 2026-08-25 · **相关度**: 30
- **作者**: Haoran Hao, Shahram Najam Syed, Jeff Schneider, Jeffrey Ichnowski
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: While Vision-Language-Action (VLA) models pretrained on large-scale robot datasets provide a strong foundation for robot manipulation, their performance can degrade when adapted to new tasks with limited task-specific demonstrations. Retrieval offers a practical way to reuse existing demonstrations for data-efficient adaptation, but existing methods often rely on visual similarity, state-action representations, or task-level language matching. These approaches may overlook the hierarchical structure of long-horizon manipulation tasks, where complete task matches are rare but reusable skills are often abundant. To address this challenge, we propose Hierarchical Skill Retrieval (HSR), a…

## 17. Imagining Recovery: Inference-Time Counterfactual Realignment for Vision-Language-Action Models

- **arXiv**: [2608.14822](https://arxiv.org/abs/2608.14822v1) · [PDF](https://arxiv.org/pdf/2608.14822v1)
- **日期**: 2026-08-14 · **相关度**: 30
- **作者**: Yanyan Zhang, Disheng Liu, Kai Ye, Chaoda Song, Xinpeng Li, Mohsen Hariri, Vikash Singh, Yu Yin, et al.
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models have improved the flexibility and generality of robotic manipulation, yet they remain fragile to online disruptions, such as changes in task goal, scene configuration, or robot state. Existing recovery methods often require failure data, policy retraining, or external corrective agents, introducing additional data requirements and execution risks. We propose Counterfactual Realignment (CoRe), a training-free framework that recovers a frozen VLA at inference time without failure data. Upon detecting a deviation, CoRe imagines how the policy would continue toward the current goal from a recent viable state, using synthesized observations in place of…

## 18. ValueFormer: A Causal Transformer Value Function with Stage-Aware Labels for Semi-Autonomous Vision-Language-Action Policies

- **arXiv**: [2608.02958](https://arxiv.org/abs/2608.02958v1) · [PDF](https://arxiv.org/pdf/2608.02958v1)
- **日期**: 2026-08-03 · **相关度**: 30
- **作者**: Inkyu Sa, Konstantin Stulov, Rajat Bhageria
- **标签**: VLA · Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-Language-Action (VLA) policies trained by behavior cloning fail silently: from the action stream alone, a collapsing rollout looks much like one making clean progress, because imitation supplies no notion of progress. Reinforcement learning would supply one, but it is impractical here, where real-robot experience is costly and deformable food resists simulation. The cheap alternative, a terminal success / failure bit, is learnable in principle yet far too sparse to say when a rollout went wrong. We argue that the per-frame label, not the architecture, is the hard part: to be useful it must be dense, continuous, and correctly shaped. We present ValueFormer, a compact policy-agnostic…

## 19. RL$^2$-VLA: Adaptive RL Latent Compositional Steering with Test-Time Scaling for Vision-Language-Action Models

- **arXiv**: [2607.26991](https://arxiv.org/abs/2607.26991v2) · [PDF](https://arxiv.org/pdf/2607.26991v2)
- **日期**: 2026-07-29 · **相关度**: 30
- **作者**: Derek Ming Siang Tan, Shailesh Shailesh, Srikrishna Iyer, William Wei Jie Teo, Yuanliang Ju, Qiao Gu, Guillaume Sartoretti
- **标签**: VLA · Offline RL · Real robot
- **与主线的关系**: 关注离线失败/次优数据的再利用，降低真实交互成本；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Despite the impressive visuomotor capabilities enabled by Vision-Language-Action (VLA) models, their performance often degrades on challenging and out-of-domain tasks. Recent test-time steering and scaling methods improve performance without extensive data collection and retraining, but action samples often remain concentrated around similar behaviors and therefore inherit correlated failure modes. Moreover, existing methods apply the same intervention strategy at every timestep, regardless of whether the base policy is already likely to succeed. To address these limitations, we introduce $RL^2$, an adaptive inference-time steering framework that leverages Reinforcement Learning on VLA…

## 20. FutureRTC: Real-Time Robot Execution with Anticipatory-Conditioned Action Chunking

- **arXiv**: [2607.24008](https://arxiv.org/abs/2607.24008v1) · [PDF](https://arxiv.org/pdf/2607.24008v1)
- **日期**: 2026-07-27 · **相关度**: 30
- **作者**: Hai Jiang, Yixian Zou, Binbin Liang, Boqian Liu, Fanman Meng, Shuaicheng Liu
- **标签**: VLA · Value/Q · Real robot · Latency
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Real-time deployment of Vision-Language-Action (VLA) policies necessitates asynchronous execution, wherein subsequent action chunks are computed concurrently with the execution of the current chunk, leading to prediction-execution misalignment and manifesting as inter-chunk discontinuities. Existing methods either superficially smooth chunk boundaries, require costly policy optimization, or exclusively forward-predict proprioceptive states yet neglect critical visual observations. In this paper, we propose \textbf{FutureRTC}, a plug-and-play adaptation framework that predicts execution-time observations and states for asynchronous VLA control without modifying the underlying policy.…

## 21. Closing the Lab-to-Store Gap: A Data-Efficient Post-Training and Experience-Driven Learning VLA Framework for Retail Humanoids

- **arXiv**: [2607.20345](https://arxiv.org/abs/2607.20345v1) · [PDF](https://arxiv.org/pdf/2607.20345v1)
- **日期**: 2026-07-22 · **相关度**: 30
- **作者**: Roger Sala Sisó, Tiago Silvério, Jakob Sand, Tran Nguyen Le
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Closing the gap between benchmark performance and reliable real-world operation remains a central challenge for Vision-Language-Action (VLA) humanoid robots, which must handle execution errors, distribution shifts, and environmental variability. This paper presents DEED (Data-Efficient Post-Training and Experience-Driven Learning), a systems-level approach evaluated on a supermarket chip-restocking task using a Unitree G1-Edu humanoid robot and the GR00T N1.6 foundation model. DEED comprises three key components: (1) a data-efficient post-training pipeline with control-frequency alignment, data curation, task-relevant visual highlighting, and reduced VLA dependence; (2) a real-world study…

## 22. CIDER: Continual Interactive Distillation for Embodied Reinforcement Learning

- **arXiv**: [2608.21899](https://arxiv.org/abs/2608.21899v1) · [PDF](https://arxiv.org/pdf/2608.21899v1)
- **日期**: 2026-08-22 · **相关度**: 29
- **作者**: Houlin Li, Minghui Xu, Guo Xu, Xuan Du, Xiaohan Yan, Chun Wang, Yuxiang Yan, Shukai Yang, et al.
- **标签**: Human-in-loop · Real robot · Distillation
- **与主线的关系**: 解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Human-in-the-loop real-world reinforcement learning enables rapid acquisition of effective robotic manipulation policies for individual tasks, often within tens of minutes. Yet it remains unclear how to extend this paradigm to continual learning, where a single policy must acquire new skills without losing previously learned behaviors. Existing real-world continual learning methods do not explicitly constrain prior behaviors, leading to severe catastrophic forgetting. We introduce Continual Interactive Distillation for Embodied Reinforcement Learning (CIDER), a continual reinforcement learning framework that freezes the accumulated historical policy as a teacher before learning each new…

## 23. EXIMO: VLM Guided Exploration of VLA Policies

- **arXiv**: [2608.19891](https://arxiv.org/abs/2608.19891v1) · [PDF](https://arxiv.org/pdf/2608.19891v1)
- **日期**: 2026-08-20 · **相关度**: 29
- **作者**: Bhavya Sukhija, Oliver Groth, Mohit Shridhar, Tim Hertweck, Michael Bloesch, Markus Wulfmeier, Abbas Abdolmaleki, Martin Riedmiller
- **标签**: VLA · Offline RL
- **与主线的关系**: 关注离线失败/次优数据的再利用，降低真实交互成本；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: How to efficiently finetune robot policies to learn new tasks on the fly? State of the art robotic manipulation policies are based on behaviour cloning of large vision-language-action (VLA) models with billions of parameters on huge teleoperation datasets. While this simple approach has enabled significant advances for robotic manipulation, finetuning of VLA policies for learning new tasks still remains an open problem. In particular, collecting teleoperation datasets requires hundreds of hours of expensive human labour and the alternative, reinforcement learning (RL), can be notoriously sample-inefficient especially for long-horizon tasks. In addition, RL with VLAs imposes several…

## 24. Structure-Aware Robust Fine-Tuning: Defending Vision-Language-Action Robots Against Physical Attention Hijacking

- **arXiv**: [2608.03231](https://arxiv.org/abs/2608.03231v1) · [PDF](https://arxiv.org/pdf/2608.03231v1)
- **日期**: 2026-08-04 · **相关度**: 29
- **作者**: Jinquan Zhang, Dongfu Yin, Run Yang, Yufeng Yan, Zhen Tian, F. Richard Yu
- **标签**: VLA · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-Language-Action (VLA) policies promise general robotic manipulation, but their robustness against physical-world attacks remains fragile. In particular, we show that physically realizable adversarial patches can reliably induce failures by triggering a mechanism we call policy-critical action-to-vision attention hijacking, where action-conditioned attention is diverted from task-relevant regions to a localized patch. To demonstrate the threat, we propose Attention-Guided Semantic Disruption (AGSD), an Expectation-over-Transformation (EOT) optimized printable patch that jointly (i) concentrates action-to-vision attention on the patch and (ii) disrupts vision-language semantic…

## 25. RLMM-Flow: A Flow-based Mobile Manipulation Framework with Latent-Space Reinforcement Learning

- **arXiv**: [2607.26460](https://arxiv.org/abs/2607.26460v1) · [PDF](https://arxiv.org/pdf/2607.26460v1)
- **日期**: 2026-07-29 · **相关度**: 29
- **作者**: Shuhang Wang, Ziming Li, Hui Cheng
- **标签**: Flow · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: Mobile manipulation requires generating whole-body action chunks that jointly satisfy goal reaching, collision avoidance, base kinematic constraints, manipulator joint limits, and trajectory smoothness. Flow-based generative policies provide an efficient paradigm for learning multimodal and temporally consistent motion priors from expert demonstrations, but imitation-only training cannot improve policy quality beyond the demonstration distribution. We propose RLMM-Flow, a flow-based mobile manipulation framework that combines expert flow-policy pretraining with latent-space reinforcement learning post-training. The framework first learns a flow policy that captures a multimodal whole-body…

## 26. JoyNexus: Service-Oriented Multi-Tenant Post-Training for VLA Models

- **arXiv**: [2607.16074](https://arxiv.org/abs/2607.16074v1) · [PDF](https://arxiv.org/pdf/2607.16074v1)
- **日期**: 2026-07-17 · **相关度**: 28
- **作者**: Haoran Sun, Wentao Zhang, Junyang Hua, Hedan Yang, Yongjian Guo, Yifei Zhang, Xiaolong Xiang, Mingxi Luo, et al.
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: The post-training of Vision-Language-Action (VLA) models is essential due to the diversity of simulators, robot embodiments, and task objectives. Existing compute services, whether offered as direct accelerator rental or batch-workload submission, typically allocate an exclusive set of GPU and CPU resources to a single tenant. While this paradigm maximizes client flexibility, it burdens users with infrastructure adaptation, and the fixed card-hour accounting model renders short or bursty workloads both expensive for tenants and inefficient for the service provider. To address these challenges, we present JoyNexus, a unified service for multi-tenant VLA supervised fine-tuning, reinforcement…

## 27. G0.5: One Autoregressive Stream for Robot Reasoning and Action

- **arXiv**: [2608.11739](https://arxiv.org/abs/2608.11739v1) · [PDF](https://arxiv.org/pdf/2608.11739v1)
- **日期**: 2026-08-12 · **相关度**: 27
- **作者**: Yicheng Liu, Zibin Dong, Baijun Ye, Tianyuan Yuan, Tao Jiang, Anqi Yang, Shicheng Cao, Haonan Liu, et al.
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: The prevailing recipe for Vision-Language-Action (VLA) models couples a pretrained VLM with a separately trained flow-matching action expert. This makes the VLM a context encoder rather than a decision-maker. We introduce G0.5, a pretrained autoregressive VLA in which a single transformer decoder emits reasoning and action tokens under a single objective. Three components make this tractable at foundation-model scale: a learnable cross-embodiment action tokenizer that maps heterogeneous robot actions into a shared vocabulary; a native chain-of-thought stream interleaving task decomposition, object grounding, and action hints with action tokens; and a visual memory module that injects…

## 28. Uncovering and Mitigating Positional Blind Spots in Vision-Language-Action Models

- **arXiv**: [2608.01573](https://arxiv.org/abs/2608.01573v1) · [PDF](https://arxiv.org/pdf/2608.01573v1)
- **日期**: 2026-08-03 · **相关度**: 27
- **作者**: Dongdong An, Pengjie Zhao, Yihao Huang, Wenbing Tang, Ziming He, Jiayi Zhu, Jifeng Ning, Qin Zhao
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Recent Vision-Language-Action (VLA) models achieve promising performance in robotic manipulation, typically measured by success rates aggregated over predefined object configurations, an evaluation that implicitly assumes spatially uniform competence across the workspace. However, this assumption does not hold: even with the instruction and every other scene factor held fixed, merely relocating a task-irrelevant distractor can sharply raise the failure probability within localized, spatially coherent regions, which we term Positional Blind Spots (PBS). In this paper, we propose a two-stage black-box framework to uncover and mitigate PBS. During the uncovering stage, we grid the workspace…

## 29. Q-Learning With World Models

- **arXiv**: [2608.17163](https://arxiv.org/abs/2608.17163v1) · [PDF](https://arxiv.org/pdf/2608.17163v1)
- **日期**: 2026-08-17 · **相关度**: 26
- **作者**: Perry Dong, Yueru Jia, Chelsea Finn, Dorsa Sadigh
- **标签**: VLA · Offline RL · Value/Q · Real robot · Model-based
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Off-policy reinforcement learning (RL) has become increasingly sample-efficient, enabling applications such as RL fine-tuning of Vision-Language-Action models into reliable, high-performing policies. World models offer a further lever for sample efficiency, as they predict state changes rather than actions alone, but their success has largely been confined to supervised policy learning. Prior model-based RL methods often optimize the policy or value function directly on imagined rollouts, which is prone to compounding bias and struggles to scale to large, high-dimensional problems such as real-world robotics, a problem that worsens with task horizon and visual complexity. In this work, we…

## 30. PACE: Phase-Progress-Aware Credit for Long-Horizon Embodied Manipulation

- **arXiv**: [2608.15026](https://arxiv.org/abs/2608.15026v1) · [PDF](https://arxiv.org/pdf/2608.15026v1)
- **日期**: 2026-08-15 · **相关度**: 26
- **作者**: Chengye Song, Jiawei Zhang, Rui Song, Shengqi Wang, Xiangrong Zhang, Ziyi Wang, Huanbin Zhou, Hongzhou Wang
- **标签**: VLA · Value/Q · Real robot · Distillation
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Post-training of vision-language-action (VLA) models typically relies on expert demonstrations and policy interaction trajectories. However, in long-horizon manipulation, a single episode often spans hundreds of control steps and multiple phases, while success or failure is only revealed at episode termination. Policy improvement therefore requires step-level credit signals to distinguish behaviors that advance the task from those that stall or regress. We present PACE, a credit-assignment framework for post-training on long-horizon manipulation, centered on a phase-progress-aware critic. PACE consists of two key modules: (1) the Global-Local Cooperative Value-Correction Critic…

## 31. SiMDex: Mining Similar Egocentric Videos for Cross-Embodiment Dexterous Manipulation

- **arXiv**: [2608.04196](https://arxiv.org/abs/2608.04196v1) · [PDF](https://arxiv.org/pdf/2608.04196v1)
- **日期**: 2026-08-04 · **相关度**: 26
- **作者**: Nie Lin, Takehiko Ohkawa, Sijin Chen, Ruoshi Wen, Zhuohang Li, Liqun Huang, Zhengming Zhu, Yiming Bao, et al.
- **标签**: VLA · Dexterity/Tactile
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Recent years have witnessed an explosive trend of scaling ego-centric human videos for robot manipulation, yet it remains unclear which data actually benefits dexterous manipulation. We present SiMDex, a similarity-based data mining framework that casts human data selection for VLA post-training in dexterous manipulation as a recommendation problem. For each robot demonstration, SiMDex employs a three-layer recall-ranking-re-ranking pipeline to extract task-relevant subsets from a pool of ~32M egocentric human samples, operating in a morphology-agnostic action space that requires no changes to VLA architecture or training. Against a strong baseline trained with an equal amount of randomly…

## 32. US-VLA: An Ultrasound Vision-Language-Action Model for Embodied Abdomina

- **arXiv**: [2608.16074](https://arxiv.org/abs/2608.16074v1) · [PDF](https://arxiv.org/pdf/2608.16074v1)
- **日期**: 2026-08-17 · **相关度**: 25
- **作者**: Cheng Zhang, Xingzheng Wu, Guihao Yan, Xifeng Hu, Zhi Liu, Mei Wu, Qing Cai
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Artificial intelligence-assisted ultrasound scanning enhances diagnostic reliability and efficiency by providing real-time guidance for standardized image acquisition and reducing operator dependence. However, existing reinforcement learning and learning-assisted ultrasound scanning methods typically rely on carefully designed reward functions or extensive interaction data, which limits their generalization ability and stability across different devices, patient populations, and complex clinical scenarios. To address these challenges, we propose an ultrasound vision-language-action model (US-VLA) for automated ultrasound scanning that explicitly encodes clinical semantic goals and…

## 33. HiFi-UMI: Learning Deployable Manipulation Policies from High-Fidelity UMI Data Alone

- **arXiv**: [2607.25895](https://arxiv.org/abs/2607.25895v1) · [PDF](https://arxiv.org/pdf/2607.25895v1)
- **日期**: 2026-07-28 · **相关度**: 25
- **作者**: Simple AI, :, Yuteng Wei, Jinming Ma, Jiawei Wang, Weitao Zhou, Yushen Zuo, Ke Rui, et al.
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Learning deployable manipulation policies is bottlenecked by the scarcity of data that is both high-fidelity and scalable. Real-robot teleoperation is accurate but costly to scale; robot-free UMI capture scales readily, and current practice uses the resulting data mainly for pre-training, adding a small real-robot "anchor" at post-training. We ask whether raising the fidelity of robot-free UMI data, rather than shrinking the real-robot fraction, can remove that anchor. We present HiFi-UMI, a portable UMI data-production system co-designed for trajectory accuracy, inter-gripper relative pose, synchronization, and field of view: head-mounted offline stereo-inertial SLAM, native rather than…

## 34. Real2Sim2Real for Vision-Language-Action Manipulation: An AMD ROCm-Based Pipeline

- **arXiv**: [2607.22997](https://arxiv.org/abs/2607.22997v1) · [PDF](https://arxiv.org/pdf/2607.22997v1)
- **日期**: 2026-07-25 · **相关度**: 25
- **作者**: Qing Yang, Xun Wang, Ziguan Wang, Zhenjiang Li, Hongqiang Wang, Dongdong Weng
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Physical AI -- the integration of large vision-language-action (VLA) models with embodied agents that act in the real world -- has emerged as the next major frontier for AI, echoed by industry leaders such as Jensen Huang (``the next big thing is Physical AI, AI with a body,'' GTC Paris, June 2025) and Dr. Lisa Su (`we're entering the world of Physical AI ... this is where AI enters the real world,' CES 2026). This paper presents an end-to-end, fully AMD-accelerated technology stack for embodied manipulation, spanning data-center training silicon, Radeon PRO simulation/rendering GPUs, and Ryzen AI edge compute, unified by the open ROCm software stack. We demonstrate that training and…

## 35. GAINS: Leveraging Inconsistent Human Intervention Signals in Reinforcement Learning

- **arXiv**: [2608.15707](https://arxiv.org/abs/2608.15707v1) · [PDF](https://arxiv.org/pdf/2608.15707v1)
- **日期**: 2026-08-16 · **相关度**: 24
- **作者**: Xinyi Zhang, Yinuo Zhao, Pei Ren, Lechun Jiang, Huiqian Jin, Lei Sun, Dapeng Wu, Zhengping Che, et al.
- **标签**: Human-in-loop · Real robot
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Correcting robot manipulation policies through human intervention holds great promise for real-world deployment, yet human operators are inherently imperfect in both the actions they provide and the timing of their intervention signals. While the former has been extensively discussed in reinforcement learning (RL), the latter remains underexplored. At high control frequencies, human intervention signals are often delayed and inconsistent across time and state space. In this work, we present GAINS, a framework for leveraging inconsistent human intervention signals in RL. At the core of GAINS, we employ distributional RL with quantile Q-networks to model the return variability induced by…

## 36. StellaVLA: In-Context Structured Demonstration for Generalizable Vision-Language-Action Models

- **arXiv**: [2608.11671](https://arxiv.org/abs/2608.11671v1) · [PDF](https://arxiv.org/pdf/2608.11671v1)
- **日期**: 2026-08-12 · **相关度**: 24
- **作者**: Siyu Xu, Yunke Wang, Zijian Wang, Dihao Zhu, Chenghao Xia, Chengbin Du, Daochang Liu, Tao Huang, et al.
- **标签**: VLA · Real robot · Latency
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Vision-Language-Action (VLA) models can follow instructions and manipulate objects, but their performance often collapses out of distribution (OOD), when the scene, viewpoint, or object differs from training. Adapting to each new situation typically requires collecting more data and fine-tuning. We present StellaVLA, a framework that instead adapts at test time by conditioning on a single retrieved demonstration. The key idea is to move beyond imitating what an expert did and instead convey why: an automated offline pipeline converts each raw trajectory into a structured demonstration, e.g., a task plan, sub-goal descriptions, and verbalized 3D motion, at zero human-annotation cost.…

## 37. CosFly-VLA: A Spatially Aware Vision-Language-Action Model for UAV Tracking

- **arXiv**: [2607.15004](https://arxiv.org/abs/2607.15004v1) · [PDF](https://arxiv.org/pdf/2607.15004v1)
- **日期**: 2026-07-16 · **相关度**: 24
- **作者**: Ruilong Ren, Songsheng Cheng, Yunpeng Zhou, Hanxuan Chen, Xiangyue Wang, Tianle Zeng, Shuai Yuan, Binbo Li, et al.
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Dynamic target tracking is essential for Unmanned Aerial Vehicles (UAVs) operating in complex urban environments, where both the target and the camera viewpoint change continuously. Existing Vision-Language-Action (VLA) policies can track visible targets effectively, but their performance often degrades when buildings, vegetation, or roadside objects block the line of sight. During sustained occlusion, a policy may lose the target state, execute actions toward an incorrect region, and amplify this error through subsequent observations until re-acquisition becomes impossible. To this end, we present CosFly-VLA, a spatially aware VLA model that jointly grounds the target, estimates its…

## 38. C2Dex: Contact-Consistent Reconstruction and Retargeting for Dexterous Manipulation from Monocular Video

- **arXiv**: [2608.07045](https://arxiv.org/abs/2608.07045v1) · [PDF](https://arxiv.org/pdf/2608.07045v1)
- **日期**: 2026-08-07 · **相关度**: 23
- **作者**: Jie Ren, Zhehao Jiang, Yinhong Yang, Haorui Jia, Han Jiang, Ben Li, Yao Yao, Cheng Lin, et al.
- **标签**: Real robot · Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: High-quality demonstrations for dexterous robot manipulation are costly and difficult to collect, whereas monocular human videos provide a scalable source of diverse manipulation behaviors. However, transferring such demonstrations to dexterous robots remains challenging: monocular hand-object interaction (HOI) reconstruction often produces temporally unstable contacts and physically implausible interactions, while conventional retargeting methods struggle to preserve task-relevant contacts and local interaction geometry across different hand embodiments. We present C2Dex, a video-to-dexterous-manipulation framework built around a shared interaction representation: stable object-side…

## 39. $N_0$-VTLA: Scaling Vision-Tactile-Language-Action Model with Latent Tactile Tokens

- **arXiv**: [2607.23782](https://arxiv.org/abs/2607.23782v1) · [PDF](https://arxiv.org/pdf/2607.23782v1)
- **日期**: 2026-07-26 · **相关度**: 23
- **作者**: NeoteAI Team, Fudan TEAI Team
- **标签**: Offline RL · Real robot · Dexterity/Tactile
- **与主线的关系**: 关注离线失败/次优数据的再利用，降低真实交互成本；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: We present $N_0$-VTLA, a vision-tactile-language-action (VTLA) foundation model capable of (1) fine-grained contact-rich manipulation with tactile perception and tactile-feedback control, and (2) offline policy improvement from stored deployment data. Building on current vision-based backbones, we propose a training recipe for tactile integration consisting of visuo-tactile pre-training, staged tactile-pathway integration, and advantage-conditioned offline policy improvement. During pre-training, the policy learns broad contact priors from NeoData, our large-scale visuo-tactile robot dataset; to our knowledge, $N_0$-VTLA is the first VTLA model pretrained on tactile data at scale. During…

## 40. $R^3$: Training Robots to Reason in Natural Language via Reinforcement Learning

- **arXiv**: [2608.26053](https://arxiv.org/abs/2608.26053v1) · [PDF](https://arxiv.org/pdf/2608.26053v1)
- **日期**: 2026-08-26 · **相关度**: 22
- **作者**: Lehong Wu, Yuxiao Qu, Zheyuan Hu, Ivan Zhang, Limin Wei, Zackory Erickson, Aviral Kumar
- **标签**: Robot RL
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Reasoning in language allows foundation models to spend more test-time compute on hard problems, such as those requiring decomposition, constraint tracking, and prediction of future consequences. Whether this mechanism can improve robotic manipulation remains unclear, where long-horizon tasks require tracking partial progress, reasoning about object relations, recovering from mistakes, and steering noisy low-level policies. In this paper, we study whether VLMs can be trained to reason directly in natural language to guide low-level manipulation policies. We introduce $R^3$, a simple post-training recipe that turns off-the-shelf VLMs into robotic reasoners: it first mid-trains a VLM on…

## 41. PhaseLoRA: Control-Regime-Conditioned Low-Rank Adaptation for Continuous-Action Vision-Language-Action Policies

- **arXiv**: [2608.15285](https://arxiv.org/abs/2608.15285v1) · [PDF](https://arxiv.org/pdf/2608.15285v1)
- **日期**: 2026-08-15 · **相关度**: 22
- **作者**: Yufei Guo, Yinan Wu, Haoran Duan, Guiguang Ding, Jungong Han
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Parameter-efficient fine-tuning (PEFT) is a natural way to adapt pretrained vision-language-action (VLA) policies, but most adapter designs apply temporally static updates throughout a control rollout, overlooking the phase-dependent nature of continuous-action manipulation. Such policies traverse distinct regimes, including approach, contact transition, grasping, transport, and placement, each requiring different adaptation behaviors. We propose \textbf{PhaseLoRA}, a lightweight LoRA parameterization that conditions adaptation at each action-chunk prediction step using two weakly supervised descriptors: fine-control tendency and event/boundary intensity. PhaseLoRA modulates the LoRA left…

## 42. Explicit Language Memory for Long-Horizon Planning in Vision-Language-Action Models

- **arXiv**: [2608.04765](https://arxiv.org/abs/2608.04765v1) · [PDF](https://arxiv.org/pdf/2608.04765v1)
- **日期**: 2026-08-05 · **相关度**: 22
- **作者**: Houze Xu, Jizhong Li, Ziyi Ye
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models provide a unified paradigm for connecting visual perception, language understanding, and robotic control. However, existing VLA models still face major challenges in long-horizon tasks: sparse expert demonstrations constrain cross-task compositional generalization; the non-Markovian nature of long-horizon tasks makes it difficult for policies conditioned only on current observations to maintain temporal consistency; limited closed-loop error correction allows execution errors to accumulate; and end-to-end action fine-tuning may weaken the high-level semantic representations of vision-language model (VLM) backbones. To address these issues, we propose a…

## 43. CLIFT: Turning Gemini Robotics On-Device into Humanoid Specialists via Non-Invasive Closed-Loop Iterative Fine-Tuning

- **arXiv**: [2607.29172](https://arxiv.org/abs/2607.29172v1) · [PDF](https://arxiv.org/pdf/2607.29172v1)
- **日期**: 2026-07-31 · **相关度**: 22
- **作者**: Yuxin Chen, Hari Srikanth, Nathan Jew, Menglin Wu, Pengcheng Wang, Junli Ren, Masayoshi Tomizuka, Peng Xu, et al.
- **标签**: VLA · Latency · Dexterity/Tactile
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: While robot foundation models are growing increasingly capable, the strongest models are typically trained on proprietary data and remain closed-source, limiting downstream users' ability to adapt them to new tasks, embodiments, and deployment settings. Following the LLM community, an emerging access paradigm for closed-weight robot foundation models is the managed supervised fine-tuning (SFT) API, where users submit training data and receive a tuned policy without access to model weights, gradients, or training internals. While such APIs let downstream users leverage powerful proprietary foundation models, they restrict policy improvement to pure imitation, ruling out reinforcement…

## 44. LENS: LLM-guided Environment Simplification for Planning and Control in Clutter

- **arXiv**: [2607.19633](https://arxiv.org/abs/2607.19633v1) · [PDF](https://arxiv.org/pdf/2607.19633v1)
- **日期**: 2026-07-22 · **相关度**: 22
- **作者**: Aileen Liao, Rachel Holladay, Dinesh Jayaraman, Michael Posa
- **标签**: VLA · Real robot · Model-based
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Despite recent advances in general-purpose robotic manipulation, real-world multi-object clutter remains challenging to handle for today's prevalent approaches. The problem scales in complexity due to more objects and collisions, more unpredictable contact physics, distractors, and task ambiguity. Bridging this gap to real-world deployment requires effective scene abstractions; yet today, producing such abstractions requires extensive task-specific manual engineering, which does not scale. These abstractions are costly to generate and difficult to adjust or fine-tune. We instead propose a plug-and-play fix to automatically generate scene-specific, task-specific, adaptively updating…

## 45. GigaBrain-0.7: Scaling Embodied Foundation Models to Emergent Capabilities with a Three-System Architecture

- **arXiv**: [2608.15875](https://arxiv.org/abs/2608.15875v1) · [PDF](https://arxiv.org/pdf/2608.15875v1)
- **日期**: 2026-08-16 · **相关度**: 21
- **作者**: GigaBrain Team, Angen Ye, Axiang Sun, Can Jin, Chenxi Cheng, Chong Shi, Dengke Shang, Dingqian Zhang, et al.
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models have become a dominant paradigm for generalist embodied agents, demonstrating strong complex and long-horizon task completion in structured settings. Yet it remains an open question whether current VLA systems can benefit from more effective architectural design, scale to substantially larger and more heterogeneous data regimes, and achieve broader generalization across tasks and embodiments. To this end, we present GigaBrain-0.7, an embodied foundation model with substantially improved generalization across diverse robot embodiments. Specifically, GigaBrain-0.7 unifies understanding, prediction, and action through a three-system architecture, scales…

## 46. Pointing-VLA: Typed Spatial Grounding Interfaces for Vision-Language-Action Manipulation

- **arXiv**: [2608.23138](https://arxiv.org/abs/2608.23138v1) · [PDF](https://arxiv.org/pdf/2608.23138v1)
- **日期**: 2026-08-24 · **相关度**: 20
- **作者**: Xiwen Chen, Zelin Li, Zhiruo Zhou, Huiming Chen, Chenwei Wang, Xiaojun Zhu
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models often expose spatial grounding through autoregressive text coordinates or opaque action tokens, creating brittle interfaces between multimodal reasoning and robot execution. We present Pointing-VLA, a typed hidden-state spatial readout built on Embodied-R1. Geometry-specific heads predict normalized points, object-functional grounding (OFG) heatmaps, and visual trajectories without serializing geometry as text. For the evaluated Bridge/WidowX and physical pick-place deployments, an explicit execution contract assigns PICK to source-conditioned OFG and PLACE to Pointing, providing direct stage-aligned spatial targets. Pointing-VLA achieves SOTA…

## 47. Learning Loco-Manipulation From SMPC Demonstrations With Sparse Offline-to-Online RL

- **arXiv**: [2608.12063](https://arxiv.org/abs/2608.12063v1) · [PDF](https://arxiv.org/pdf/2608.12063v1)
- **日期**: 2026-08-12 · **相关度**: 20
- **作者**: Martin Schuck, Maks Sorokin, Simone Manni, Duy Ta, Angela P. Schoellig, Marco Hutter, Simon Le Cleac'H, Jan Brüdigam
- **标签**: Online RL · Offline RL
- **与主线的关系**: 与 RL-100 相近：采用 offline-to-online 数据飞轮
- **摘要摘录**: Integrating locomotion and manipulation is essential for robot autonomy, but scaling standard Reinforcement Learning (RL) to complex tasks is severely bottlenecked by the slow, manual process of dense reward shaping. To bypass this limitation, we leverage Sample-based Model Predictive Control (SMPC) entirely in simulation as an automated, rapidly tunable expert to generate massive offline datasets. Because this data solves the fundamental exploration problem, we can train an off-policy RL agent using purely sparse task rewards, drastically reducing the time required to learn new skills and eliminating the need for manual tuning. Integrating this high-level agent with a low-level dynamic…

## 48. Adaptation of Generalist Robot Policies with Minimal Data

- **arXiv**: [2608.11363](https://arxiv.org/abs/2608.11363v1) · [PDF](https://arxiv.org/pdf/2608.11363v1)
- **日期**: 2026-08-11 · **相关度**: 20
- **作者**: Shreyas Kowshik, Sreyas Venkataraman, Leo Wang, Niharika Pant, Max Simchowitz, Aviral Kumar
- **标签**: VLA · Online RL · Residual/Edit
- **与主线的关系**: 与 DICE 相近：在冻结/受约束的行为先验旁学习残差或编辑策略；关注真实或仿真在线交互后的策略提升；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: A central goal in robot learning is to move beyond task-specific human data collection toward robots that improve through autonomous interaction. Yet fully autonomous learning remains difficult with current policies: sparse rewards and weak zero-shot exploration make it unlikely that a robot will discover successful behavior from scratch. We study minimal-data adaptation, a regime in which a pre-trained robot policy must learn a new task from as little as one demonstration followed by autonomous online interaction. This setting serves as the closest tractable proxy for fully autonomous improvement, allowing us to study whether minimal human guidance can bootstrap autonomous learning and…

## 49. TCAM for Autonomous Deformable Manipulation: The RMC2 Champion System for WBCD 2026 Track 4

- **arXiv**: [2608.10718](https://arxiv.org/abs/2608.10718v1) · [PDF](https://arxiv.org/pdf/2608.10718v1)
- **日期**: 2026-08-11 · **相关度**: 20
- **作者**: Guangrui Shen, Zhili He, Shigang Wang, Yuanjun Sun, Qing Yu
- **标签**: VLA · Real robot · Dexterity/Tactile
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: This technical report describes the RMC2 Team's champion solution for the WBCD 2026 Track 4: Deformable Manipulation Challenge. The task requires a robot to pick a single T-shirt from a stack, load it onto a printing pallet, align the collar with a target area, and smooth the printing region, a sequence that involves single-layer separation, deformable transport, precise placement, and contact-rich surface adjustment. The competition strongly incentivizes fully autonomous execution, motivating the development of an autonomous solution. We built a fully autonomous system around the TCAM (TermiBrain Causal Action Model) framework, with the design principle that hardware, perception, data,…

## 50. SpeedTuning: Speeding Up Policy Execution with Lightweight Reinforcement Learning

- **arXiv**: [2608.09138](https://arxiv.org/abs/2608.09138v2) · [PDF](https://arxiv.org/pdf/2608.09138v2)
- **日期**: 2026-08-10 · **相关度**: 20
- **作者**: David D. Yuan, Tony Z. Zhao, Kaylee Burns, Chelsea Finn
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: While learned robotic policies hold promise for advancing generalizable manipulation, their practical deployment is often hindered by suboptimal execution speeds. Imitation learning policies are inherently limited by hardware constraints and the speed of the operator during data collection. In addition, there are no established methods for accelerating policies learned via imitation, and the empirical relationship between execution speed and task success remains underexplored. To address these issues, we introduce SpeedTuning, a reinforcement learning framework specifically designed to enhance the speed of manipulation policies. SpeedTuning learns to predict the optimal execution speed for…

## 51. X-NavDP: Generalizing Navigation Diffusion Policy to Novel Behavior and Embodiments with Group Q-score Reweighted Matching

- **arXiv**: [2607.28560](https://arxiv.org/abs/2607.28560v2) · [PDF](https://arxiv.org/pdf/2607.28560v2)
- **日期**: 2026-07-30 · **相关度**: 20
- **作者**: Tianyu Yang, Yiming Zeng, Wenzhe Cai, Yuqiang Yang, Jiaqi Peng, Hui Cheng, Jiangmiao Pang, Tai Wang
- **标签**: Diffusion · Online RL · Real robot
- **与主线的关系**: 关注真实或仿真在线交互后的策略提升
- **摘要摘录**: Pretraining navigation diffusion policies rely on large-scale expert demonstrations. These data are typically generated by a fully-informed oracle planner suited to a single nominal robot. This limits the policy's generalization to diverse embodiments and challenging scenarios (e.g., escaping dead ends or detouring long obstacles) that demand diverse local reactive behaviors with only onboard local observations. Post-training the policy with reinforcement learning (RL) offers a principled remedy. However, previous RL for diffusion approaches lead to only marginal improvements. This is because the intractable likelihood of diffusion policies renders policy gradients unstable in addition to…

## 52. One Policy, Many Embodiments: Unified Camera-Centric Action Geometry Pre-training for Heterogeneous Embodied Manipulation

- **arXiv**: [2608.26058](https://arxiv.org/abs/2608.26058v1) · [PDF](https://arxiv.org/pdf/2608.26058v1)
- **日期**: 2026-08-26 · **相关度**: 19
- **作者**: Xiaomi Embodied Intelligence Team, University of Macau, :, Shaoqing Xu, Fang Li, Guozhi Zhan, Zhixiang Duan, Yuhan Wang, et al.
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Scaling generalist vision-language-action (VLA) policies is severely bottlenecked by the inherent heterogeneity of embodied data, which spans diverse robot morphologies, camera configurations, and low-level action spaces. Existing paradigms typically address this mismatch through explicit action retargeting, human-to-robot video synthesis, or dataset-specific adaptation branches, fundamentally hindering the joint learning of a unified policy. We introduce UCAG-P, a camera-centric unified action formulation that structurally aligns heterogeneous embodied datasets into a shared geometric action space. Rather than treating robot-specific commands as the shared policy target, UCAG-P represents…

## 53. Force/Torque-Based Kinematic Adaptation for Robotic Manipulation Tasks

- **arXiv**: [2608.21592](https://arxiv.org/abs/2608.21592v1) · [PDF](https://arxiv.org/pdf/2608.21592v1)
- **日期**: 2026-08-21 · **相关度**: 19
- **作者**: Carl Glen Henshaw
- **标签**: Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Contact-rich robotic manipulation requires an accurate model of the kinematic relationship between a robot's joints and the task features it senses. This relationship is rarely known exactly: it changes with each tool the robot picks up and shifts, sometimes almost instantaneously, as contact modes change --- especially for multi-fingered hands that make and break contact at points that are not exactly prescribed, as in full-hand grasping. This paper develops an adaptive scheme that estimates that relationship online, using only joint-angle sensing and a wrist-mounted force/torque sensor, with no exteroceptive measurement of the tool tip. We derive a provably stable kinematic update law…

## 54. Fine-Tuning VLAs with Self-Demonstrated Generative Control for Multi-Task Manipulation

- **arXiv**: [2608.19490](https://arxiv.org/abs/2608.19490v1) · [PDF](https://arxiv.org/pdf/2608.19490v1)
- **日期**: 2026-08-19 · **相关度**: 19
- **作者**: Prachi Garg, Steve Xing, Prahit Yaugand, Saurabh Gupta, Derek Hoiem
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: State-of-the-art vision-language-action (VLA) models such as $π_{0.5}$ exhibit strong semantic understanding, instruction following and task behavior. However, when deployed on new robots, even minor mismatches in hardware configuration relative to pretraining can cause severe performance drops. Finetuning the VLA on in-domain expert data from the new embodiment improves performance on the expert task but leads to a loss in its original instruction following and behavioral priors. In this paper, we propose a self-supervised method that generates online interaction rollouts from the zero-shot VLA as additional training data for finetuning. Our experiments show this finetuning scheme yields…

## 55. PDDL-ART: Autonomous Symbolic Abstraction From Demonstration For Long-Horizon Robotic Manipulation Using Vision-Language Models

- **arXiv**: [2608.17146](https://arxiv.org/abs/2608.17146v1) · [PDF](https://arxiv.org/pdf/2608.17146v1)
- **日期**: 2026-08-17 · **相关度**: 19
- **作者**: Disha Kamale, Dmitry Berenson
- **标签**: Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: Symbolic planning with PDDL offers a principled framework for long-horizon robot manipulation, but constructing accurate PDDL domain and problem descriptions remains a significant bottleneck, typically requiring substantial domain expertise. We present a Vision-Language Model (VLM)-based approach called PDDL-ART, a framework that autonomously generates task-specific PDDL domain and problem descriptions from a single expert demonstration, a natural language task description, and a library of available high-level action names. PDDL-ART does not require any domain templates, action signatures, or fine-tuning. To ensure the generated descriptions are not only syntactically valid but…

## 56. Max-Q Selective Imitation for Human-in-the-Loop Online Robot Learning

- **arXiv**: [2608.15088](https://arxiv.org/abs/2608.15088v1) · [PDF](https://arxiv.org/pdf/2608.15088v1)
- **日期**: 2026-08-15 · **相关度**: 19
- **作者**: Zihang Wang, Yishan Wang
- **标签**: Online RL · Value/Q · Human-in-loop · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注真实或仿真在线交互后的策略提升
- **摘要摘录**: Human-in-the-loop (HIL) online reinforcement learning for real robots must absorb human interventions quickly while continuing to improve beyond the human prior. We present a training method for this setting based on two components. First, an \emph{MC Q-chunk} critic regresses chunk-level action values onto Monte Carlo returns from the replay buffer, performing sample-average (behavior) policy evaluation so that intervention trajectories are credited directly rather than diluted by current-policy TD backups. Second, \emph{max-Q selective imitation} updates the actor by imitating, at each state, the higher-$Q$ action between the current policy action and a buffer sample under a hard…

## 57. RecoverFly: A Failure-Aware Reinforcement Learning Post-Training Framework for Aerial Vision-Language Navigation

- **arXiv**: [2608.09467](https://arxiv.org/abs/2608.09467v1) · [PDF](https://arxiv.org/pdf/2608.09467v1)
- **日期**: 2026-08-10 · **相关度**: 19
- **作者**: Boxiong Wang, Hui Kang, Geng Sun, Jiahui Li, Chao Yu, Daxin Tian
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Unmanned aerial vehicle vision-language navigation (UAV-VLN) requires agents to translate visual observations and language instructions into reliable flight actions in complex environments. Although recent end-to-end UAV vision-language-action (UAV-VLA) policies reduce reliance on separately designed perception, planning, and control modules, their behavior-cloning objectives provide limited corrective supervision for interactive closed-loop execution. Reinforcement learning (RL) offers a promising solution, while its effectiveness is constrained by inefficient use of samples, long-tailed scene distributions, and policy distribution shift during optimization. To this end, we propose…

## 58. WCM: World-Cognition Model for Generalizable Human-Robot Interaction

- **arXiv**: [2607.22999](https://arxiv.org/abs/2607.22999v2) · [PDF](https://arxiv.org/pdf/2607.22999v2)
- **日期**: 2026-07-25 · **相关度**: 19
- **作者**: Yuzhen Chen, KC Zhou
- **标签**: VLA · Human-in-loop · Real robot · Latency · Model-based
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Language agents can now interact fluently with users in software, but robots still struggle to bring comparable interaction to physical tasks. Current robot-control paradigms, including vision-language-action policies and world-model-based planners, are mainly optimized for instruction execution, leaving users with little visibility into why an action is chosen and few mechanisms to redirect, correct, or teach the robot through interaction. To solve this problem, we present the World-Cognition Model (WCM), a human-centered embodied agent built on the SLAK architecture (Sensing, Logic, Action, and Knowledge) and an asynchronous runtime. SLAK separates perception, reasoning, control, and…

## 59. What Matters for Latent Actions in Robot Learning

- **arXiv**: [2608.19613](https://arxiv.org/abs/2608.19613v1) · [PDF](https://arxiv.org/pdf/2608.19613v1)
- **日期**: 2026-08-20 · **相关度**: 18
- **作者**: Xizhou Bu, Qingda Hu, Lei Zhou, Lingfeng Zhang, Yingbo Tang, Zihao Liu, Xinyi Tao, Zhiqiang Ma, et al.
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Latent Action Models (LAMs) have emerged as a promising paradigm for enabling robot learning to leverage large-scale unlabeled videos through latent actions that serve as compact surrogates for physical actions. Despite rapid progress, research on LAM remains highly fragmented, with existing methods evaluating different design choices in isolation under inconsistent experimental settings, making it difficult to identify the factors that truly determine downstream robotic manipulation performance. In this work, we present the first comprehensive empirical study of latent action learning for robotic manipulation. We unify representative LAM methods within a common autoencoding framework and…

## 60. PhyAI: Real-Time Physical AI at the Edge, Scalable Rollouts in the Cloud

- **arXiv**: [2608.03682](https://arxiv.org/abs/2608.03682v3) · [PDF](https://arxiv.org/pdf/2608.03682v3)
- **日期**: 2026-08-04 · **相关度**: 18
- **作者**: Chenghua Wang, Daliang Xu, Dongqi Cai, Duojin Sun, Hao Zhang, Haoze Qian, Huaiyuan Zhang, Jinshuo Cui, et al.
- **标签**: VLA · Latency
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Physical AI policies require inference throughout their lifecycle, including model evaluation, cloud reinforcement learning rollout, edge GPU serving, and onboard deployment. Although these settings share the same checkpoint and action semantics, they often rely on separate inference programs. To unify them, we build PhyAI, a Physical AI inference engine with a single runtime that keeps architecture-specific conditioning, solver, cache, and output logic in model adapters while sharing graph execution, kernels, memory management, and parallel services. The same codebase runs vision-language-action (VLA) models and world-action models (WAMs) on single or multiple GPUs across onboard, edge,…

## 61. Upper-Expectile Multi-Step Q-Learning for Off-Policy Reinforcement Learning

- **arXiv**: [2608.02034](https://arxiv.org/abs/2608.02034v1) · [PDF](https://arxiv.org/pdf/2608.02034v1)
- **日期**: 2026-08-03 · **相关度**: 18
- **作者**: Abdelghani Ghanem, Mounir Ghogho
- **标签**: Offline RL · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本
- **摘要摘录**: Multi-step returns accelerate reward propagation in off-policy reinforcement learning, but couple the evaluation of each decision to the suboptimal logged actions that follow it, inducing a pessimistic bias that grows with the horizon. We propose Expectile $n$-step Q-learning (ENQ), which replaces the symmetric $n$-step temporal-difference (TD) loss with an asymmetric expectile loss on the action-value error, with expectile level $τ$ as the only method-specific hyperparameter added beyond $n$-step TD. We prove that the ENQ operator is a $γ^{n}$-contraction. Under deterministic dynamics, at $τ=1$, its bias vanishes at the optimal action-value function $Q^*$ on covered in-support pairs, and…

## 62. PRISM: Polynomial Representations for Interaction-Structured Motor Control

- **arXiv**: [2607.23473](https://arxiv.org/abs/2607.23473v1) · [PDF](https://arxiv.org/pdf/2607.23473v1)
- **日期**: 2026-07-26 · **相关度**: 18
- **作者**: Seung Hyun Lee, Stella X. Yu
- **标签**: Diffusion · Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Robot policies are typically MLPs mapping observations to actions. Yet robot observations are physical variables, and many action-relevant cues arise not from individual variables but from their interactions; power, inertial effects, contact, slip, and compliance depend on products among observable signals. We introduce PRISM, a policy representation that makes polynomial interactions among observable physical variables explicit, learnable, and compact. Rather than listing all polynomial terms, PRISM uses a factorized polynomial module to expose higher-order interaction features efficiently. In reinforcement learning, it keeps the standard MLP backbone but applies a gradually activated…

## 63. FIRE-VLA: Failure-Informed Self-Evolution for Vision-Language-Action Models in Autonomous Driving

- **arXiv**: [2608.13395](https://arxiv.org/abs/2608.13395v1) · [PDF](https://arxiv.org/pdf/2608.13395v1)
- **日期**: 2026-08-13 · **相关度**: 17
- **作者**: Hao Dou
- **标签**: VLA · Distillation
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Reinforcement learning improves autonomous-driving vision-language-action (VLA) models by evaluating trajectories sampled from the current policy. Group relative policy optimization (GRPO) learns from reward differences within each rollout group. When all sampled trajectories are poor, this relative signal can rank failures without identifying behavior outside the failed region. We introduce FIRE-VLA, a failure-informed self-evolution framework that converts such unresolved failures into privileged supervision for the next policy. Low-reward, low-diversity groups trigger self-distillation from a frozen round-start copy of the same model. Teacher and student have the same parameter scale,…

## 64. Learning Hierarchical Skill Policies with Offline Quality-Diversity Reinforcement Learning

- **arXiv**: [2608.19684](https://arxiv.org/abs/2608.19684v1) · [PDF](https://arxiv.org/pdf/2608.19684v1)
- **日期**: 2026-08-20 · **相关度**: 16
- **作者**: Tanachai Anakewat, Takayuki Osa, Tatsuya Harada
- **标签**: Robot RL
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Recent studies investigate how to leverage pre-collected datasets to improve the policy performance and sample efficiency of RL. One promising approach to achieve this goal is to employ a two-stage strategy: In the first stage, diverse skills are extracted as a low-level policy from a given dataset, and a high-level policy is trained to solve a specific task in the second stage. Typically, extraction of the low-level policy is performed based on unsupervised learning such as trajectory VAE. However, a limitation of this approach is that the quality of the low-level policy highly depends on the quality of the dataset. To address this issue, we introduce QDOS (Quality-Diversity Offline Skill…

## 65. TrustRoboReward: Preference-Ordered Isotonic Score Editing for Multi-Paradigm Robot Reward Models

- **arXiv**: [2608.08491](https://arxiv.org/abs/2608.08491v1) · [PDF](https://arxiv.org/pdf/2608.08491v1)
- **日期**: 2026-08-09 · **相关度**: 16
- **作者**: Yidong Wang, Yan Zhan, Ziteng Feng, Zhenyu Cui, Ziyi Zhou, Renzhao Liang, Jiaxuan Zhu, Zilei Yang, et al.
- **标签**: Robot RL
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Reward models are a bottleneck for reinforcement learning in embodied AI. Long-horizon robotic manipulation requires scalable vision feedback beyond handcrafted rewards or task-specific annotations. Existing open-source VLM reward judges like RoboReward adopt simple 1--5 trajectory progress scoring, lacking pairwise preferences for RLHF, DPO and Bradley-Terry frameworks, while failing to optimize video scene understanding. Augmenting RoboReward with pairwise comparison and video-QA supervision causes inconsistency between pairwise preferences and pointwise scores, introducing training noise and hurting downstream performance---an issue aggregation methods such as TrustJudge cannot resolve.…

## 66. SP3O: Reinforcement Learning from Segment Preferences without Reward Modeling

- **arXiv**: [2608.02951](https://arxiv.org/abs/2608.02951v1) · [PDF](https://arxiv.org/pdf/2608.02951v1)
- **日期**: 2026-08-03 · **相关度**: 16
- **作者**: Evan Assmus, Qining Zhang, Lei Ying
- **标签**: Offline RL · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本
- **摘要摘录**: Preference-based reinforcement learning (PbRL) for general stochastic MDPs often requires training a reward model. Existing reward-model-free methods are either restricted to bandits or deterministic MDPs, such as DPO or P3O, or use zeroth-order, gradient-free optimization, which in general exhibits a slower convergence rate than gradient-based algorithms. Furthermore, existing reward-model-free preference-based RL algorithms almost exclusively use trajectory-level feedback, which can require significant effort from a human evaluator when trajectories are long. On the other hand, segments are much shorter, so they are easier to compare and evaluate. In this paper, we introduce a novel…

## 67. QuantWAMs: Calibrating at the Right Granularity for World Action Models

- **arXiv**: [2607.28405](https://arxiv.org/abs/2607.28405v1) · [PDF](https://arxiv.org/pdf/2607.28405v1)
- **日期**: 2026-07-30 · **相关度**: 16
- **作者**: Jiacheng Zhou, Jinfan Lv, Ruixuan Li, Longtai Zhang, Yan Wang, Wenqiang Zhang, Lizhe Qi
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: World Action Models (WAMs) jointly predict future observations and actions, but their iterative denoising and closed-loop execution make efficient deployment costly. Existing post-training quantization (PTQ) methods are poorly suited to WAMs because they rely on open-loop objectives, homogeneous model assumptions, and calibration distributions that do not reflect deployment. We present QuantWAMs, a PTQ framework that aligns quantization decisions with the calibration context defined by model structure, rollout distribution, and task objective. QuantWAMs introduces three strategies: shared-basis outlier calibration, which pools activation evidence only across coordinate-compatible modules;…

## 68. Enhancing Sim2Real Transfer for Torque-Controlled Robots through Real2Sim Dynamics Estimation and Reinforcement Learning

- **arXiv**: [2608.22629](https://arxiv.org/abs/2608.22629v1) · [PDF](https://arxiv.org/pdf/2608.22629v1)
- **日期**: 2026-08-23 · **相关度**: 15
- **作者**: Davide Bargellini, Alex Pasquali, Andrea Govoni, Riccardo Zanella, Gianluca Palli
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Transferring reinforcement learning policies from simulation to Real-World robots remains a major challenge, particularly when dealing with low-level torque control, where even small modelling inaccuracies can lead to unstable or unsafe behaviours. In this work, we propose a Real2Sim2Real pipeline that improves Sim2Real transfer for torque-controlled robotic arms by combining trajectory matching, parameter optimization via genetic algorithms, and domain randomization. Using the 7-DOF Franka Emika Panda robot, we first identify friction, inertia, and gravity compensation parameters by minimizing the error between real and simulated joint trajectories. These calibrated dynamics are then used…

## 69. WAM-OPD: On-Policy Distillation for World Action Models

- **arXiv**: [2608.22364](https://arxiv.org/abs/2608.22364v1) · [PDF](https://arxiv.org/pdf/2608.22364v1)
- **日期**: 2026-08-23 · **相关度**: 15
- **作者**: Liuhaichen Yang, Zhuang Jiang, Chenchao Sheng, Zezhi Tang
- **标签**: Online RL · Distillation
- **与主线的关系**: 关注真实或仿真在线交互后的策略提升；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: World action models (WAMs) couple visual future prediction with robot action generation, but accelerated students can lose task capabilities during distillation and later encounter states that are poorly represented by offline data. We study whether on-policy distillation (OPD) can repair such a student without requiring sparse-reward reinforcement learning. We introduce WAM-OPD, a deployment-consistent post-training recipe for a video-first WAM. The student acts in the environment and therefore determines the history distribution. A frozen teacher labels those student histories with coherent video and action targets, while the student action branch is trained under its own generated video…

## 70. Repetition as Reinforcement: Enhancing Sample Efficiency via Instant Episode Repetition in Reinforcement Learning

- **arXiv**: [2608.17347](https://arxiv.org/abs/2608.17347v1) · [PDF](https://arxiv.org/pdf/2608.17347v1)
- **日期**: 2026-08-18 · **相关度**: 15
- **作者**: Hoda Yamani, Yuning Xing, Koen van Rijnsoever, Bruce A. MacDonald, Henry Williams
- **标签**: Real robot
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Repetition is a fundamental mechanism in human learning, where revisiting successful experiences strengthens memory, consolidates skills, and improves future performance. Motivated by this biological principle, we introduce Instant Episode Repetition (IER), a simple and novel mechanism that improves sample efficiency by immediately repeating action sequences from successful episodes during environment interaction. Unlike conventional approaches such as Experience Replay and Self-Imitation Learning (SIL), which passively reuse past experience during training updates, IER directly influences the data collection process. Upon identifying a high-reward episode, the agent repeats its action…

## 71. Dynamics-Aware Meta-Imitation for Generalization to Unseen Robotic Manipulation

- **arXiv**: [2607.15880](https://arxiv.org/abs/2607.15880v1) · [PDF](https://arxiv.org/pdf/2607.15880v1)
- **日期**: 2026-07-17 · **相关度**: 15
- **作者**: Zhenduo Shang, Xiyao Liu, Bohan Li, Xudong Wang, Teng Ren, Lianqing Liu, Zhi Han
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Imitation Learning aims to learn skills from extensive observations and demonstrations for robots, so it suffers from data scarcity and environment generalization. The existing methods predominantly focus on imitation from in-domain tasks and consequently struggle with generalization to unseen tasks. To bridge this generalization gap, we propose the \textbf{D}ynamics-\textbf{A}ware \textbf{M}eta-\textbf{I}mitation (DAMI) framework. By integrating meta-learning to construct a shared skill space, DAMI equips agents for rapid adaptation to novel tasks. We introduce the Visual-Motor Trajectory (VMT) module to capture complex spatio-temporal dynamics within the task latent space. Furthermore,…

## 72. MobilePA-Bench: Benchmarking Mobile Planner Agents on Complex Real-World Tasks

- **arXiv**: [2608.23035](https://arxiv.org/abs/2608.23035v2) · [PDF](https://arxiv.org/pdf/2608.23035v2)
- **日期**: 2026-08-24 · **相关度**: 14
- **作者**: Yi Zhu, Xiongwei Wu, Qiyi Wang, Tingyu Qu, Jiajun Liu, Sihan Cao, Long Chen, Weigao Sun, et al.
- **标签**: Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: As on-device LLM agents evolve into personal copilots, the mobile operating system has become a key testbed for this paradigm, making rigorous capability evaluation essential. Yet existing benchmarks fall into two camps, each with a critical blind spot: GUI-centric benchmarks test surface-level screen manipulation while overlooking background tool use and long-horizon planning, whereas static function-calling benchmarks rely on offline API matching that is detached from real runtime constraints. To close this gap, we present \textbf{MobilePA-Bench}, an interactive, stateful, and tool-centric benchmark for evaluating the tool-calling and planning abilities of mobile planning agents.…

## 73. Iterative Grasp Pose Refinement: A Deep Reinforcement Learning Approach for 2D Vision

- **arXiv**: [2608.17628](https://arxiv.org/abs/2608.17628v1) · [PDF](https://arxiv.org/pdf/2608.17628v1)
- **日期**: 2026-08-18 · **相关度**: 14
- **作者**: Amir Arsalan Nematollahi, Shayan Ahmadi, Mehdi Tale Masouleh, Ahmad Kalhor
- **标签**: Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Developing robots capable of understanding and manipulating objects requires compact, interpretable, and generalizable representations. This work proposes a reinforcement learning-based framework for robotic grasp refinement, integrating keypoint-based object representations with a Deep Q-Network (DQN). Using 2D overhead images captured in a simulated environment, a geometric-based algorithm generates initial grasp candidates, which are iteratively refined by the proposed framework, transforming failed grasps into successful ones. Experiments conducted on 300 objects from the Dex-Net dataset using a UR5 manipulator demonstrate the framework's effectiveness, achieving a 100% success rate on…

## 74. MANIGUARD: A Benchmark and Data Suite for Specification-Grounded Safety Evaluation and Improvement of Robotic Manipulation

- **arXiv**: [2608.17386](https://arxiv.org/abs/2608.17386v1) · [PDF](https://arxiv.org/pdf/2608.17386v1)
- **日期**: 2026-08-18 · **相关度**: 14
- **作者**: Yiyan Peng, Philip Wang, Simon Sinong Zhan, Yiqi Lyu, Zhenyang Ni, Jixin Yan, Fiorelli Wong, Ruochen Jiao, et al.
- **标签**: Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Foundation-model policies for robotic manipulation are advancing rapidly on task success, but rigorous evaluation of whether they succeed safely is still lacking. We introduce ManiGuard, a specification-grounded framework for evaluating and improving the safety of foundation-model manipulation, comprising the ManiGuard-Bench task suite and a paired safety-annotated trajectory-generation pipeline. ManiGuard-Bench organizes six contact-rich household task families into 200 locked base tasks along a skill $\times$ constraint taxonomy, with safety specified independently of task success. Each task is evaluated under one in-distribution and four single-axis out-of-distribution perturbations…

## 75. LUCID: Latent-Skill Unified Control via Imagined Dynamics for Long-Horizon Humanoid Loco-Manipulation

- **arXiv**: [2608.07746](https://arxiv.org/abs/2608.07746v1) · [PDF](https://arxiv.org/pdf/2608.07746v1)
- **日期**: 2026-08-07 · **相关度**: 14
- **作者**: Cheng Guo, Mingzhe Ni, Angelo Cangelosi, Arash Ajoudani
- **标签**: Model-based
- **与主线的关系**: 通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Long-horizon humanoid loco-manipulation requires composing versatile whole-body skills and reliable high-level decision making. Existing methods often coordinate pretrained skills with scripted planners, finite-state machines or task-specific model-free policies, restricting their ability to handle complex task sequences. To address this limitation, we propose \textbf{LUCID}, a hierarchical model-based reinforcement learning framework that plans over reusable skills through imagined rollouts of a learned dynamics model. LUCID first trains a structured latent-conditioned low-level policy via adversarial imitation and then freezes it while jointly learning a high-level policy and…

## 76. Search-Aided Joint Agent-Environment Reinforcement Learning for Robust Lifelong Multi-Agent Path Finding with Rotations

- **arXiv**: [2608.05588](https://arxiv.org/abs/2608.05588v1) · [PDF](https://arxiv.org/pdf/2608.05588v1)
- **日期**: 2026-08-06 · **相关度**: 14
- **作者**: He Jiang, Jingtian Yan, Yulun Zhang, Yimin Tang, Tanishq Duhan, Rishi Veerapaneni, Guillaume Sartoretti, Jiaoyang Li
- **标签**: Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: Lifelong Multi-Agent Path Finding (LMAPF) requires repeatedly planning collision-free paths for agents that continuously receive new goals upon reaching their current ones. While many learning-based planners have been proposed for LMAPF, most rely on oversimplified kinematic assumptions that may overlook motion constraints critical to real-world performance. In this work, we study a more realistic LMAPF model derived from many real-world automated warehouse systems, termed LMAPF-R2, which incorporates robust safety constraints and in-place rotation constraints. These constraints substantially increase coordination difficulty, particularly in highly constrained spaces. To address these…

## 77. LAC: Linear and Angular Compliance for Humanoid Whole-body Control

- **arXiv**: [2608.25405](https://arxiv.org/abs/2608.25405v1) · [PDF](https://arxiv.org/pdf/2608.25405v1)
- **日期**: 2026-08-26 · **相关度**: 13
- **作者**: Yang Liu, Zhongkai Gu, Wei Zhu, Mitsuhiro Hayashibe
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Real-world humanoid tasks involve physical interaction with objects and humans, yet current controllers either reject external forces as disturbances or restrict compliance to limited body links while ignoring angular effects. We present LAC, a general whole-body controller that simultaneously realizes commanded Linear and Angular Compliance for wrenches applied to the upper body. First, we synthesize whole-body compliant responses into a large-scale augmented dataset. Sampled force and couple events are imposed on contact frames extracted from human interaction data. At each contact link, the external force and a virtual torque from the passively yielding kinematic chain drive a virtual…

## 78. FetchMan: Learning Visual Humanoid Loco-Manipulation Policies from Simulated Experiences

- **arXiv**: [2608.17027](https://arxiv.org/abs/2608.17027v1) · [PDF](https://arxiv.org/pdf/2608.17027v1)
- **日期**: 2026-08-17 · **相关度**: 13
- **作者**: Omar Rayyan, Zhi Li, Max Argus, Yuxin Jiang, Chang Yu, Chenfanfu Jiang, Yuchen Cui
- **标签**: Real robot
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Visual loco-manipulation policies that can generalize to novel scenes and objects have long been a goal of robotics research. However, today's data-hungry algorithms make collecting sufficient demonstrations a struggle for tabletop manipulation, and even more so for humanoids that must also walk and balance. Learning from simulated data and transferring that behavior to the real world, as is commonly done in locomotion, sidesteps this struggle, so we replicate that recipe for loco-manipulation. In doing so, we find that cloning synthetic demonstrations results in a low performance ceiling no matter the amount of training data. Reinforcement learning breaks through it, and refining the…

## 79. Navigating the Proximity-Safety Balance: Constraint Decomposition for Human Following in Pedestrian Crowds

- **arXiv**: [2608.10056](https://arxiv.org/abs/2608.10056v1) · [PDF](https://arxiv.org/pdf/2608.10056v1)
- **日期**: 2026-08-10 · **相关度**: 13
- **作者**: Shiting Gong, Jianpeng Yao, Jinfeng Wang, Marco Pavone, Jiachen Li
- **标签**: Real robot
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Following a target human in crowded environments involves an inherent conflict between staying close to the target and navigating safely among surrounding pedestrians and obstacles. This conflict becomes more severe in dense scenarios, where aggressive following risks collisions and conservative margins lead to target loss, especially when pedestrian behaviors are unfamiliar or unpredictable. Existing reinforcement learning (RL) methods typically encode these competing objectives into a single dense reward, but the resulting proximity-safety balance is implicit and difficult to adjust across conditions. To address this, we decompose the human-following task into a sparse task reward and…

## 80. Decoupling Intention from Trajectory: A Representational Deduction Framework for World Action Models

- **arXiv**: [2608.06994](https://arxiv.org/abs/2608.06994v1) · [PDF](https://arxiv.org/pdf/2608.06994v1)
- **日期**: 2026-08-07 · **相关度**: 13
- **作者**: Xiangkai Ma, Yue Ma, Junjie Wang, Sheng Xu, Mingyang Li, Han Zhang, Yuzheng Zhuang, Wenzhong Li, et al.
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: World Action Models (WAMs) aim to construct a unified architecture capable of understanding world state evolution and guiding to generative motion planning. However, existing visual branches focus on predicting static visual observation, rather than reflecting potential transition information that captures the evolution of world states under motion interactions. This leads to representational entanglement between high-level physical condition evolution and low-level action trajectory generation within the Action Model, creating a structural bottleneck while weakening the predictive capability of world evolution modeling for action generation. We propose PILOT (Physical Inference for Latent…

## 81. RORA: Realistic Object Reconstruction with Articulation

- **arXiv**: [2608.04842](https://arxiv.org/abs/2608.04842v1) · [PDF](https://arxiv.org/pdf/2608.04842v1)
- **日期**: 2026-08-05 · **相关度**: 13
- **作者**: Hyesung Lee, Youngseon Lee, Kyutae Lee, Dongjun Lee, Yongseok Lee
- **标签**: Human-in-loop · Real robot · Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Replicating real-world environments into simulation by realistic visual representation like NeRF and 3D Gaussian Splatting (3DGS) has emerged as an effective strategy to reduce the sim-to-real gap in robot learning. However, implementing object articulation during the real-to-sim process is still a challenging task. Existing motion tracking or learning based articulation methods shows low success rates on complex kinematic structures having multiple joints. Furthermore, those methods require scan of dynamic motion of objects, which makes reconstruction process much complicated. In this work, we propose the first end-to-end pipeline that reconstructs simulation-ready assets with accurate…

## 82. VLAGuard: A Framework for Evaluating and Mitigating Physical Attention Hijacking in Vision-Language-Action Robots within Wireless Sensor Networks

- **arXiv**: [2608.01028](https://arxiv.org/abs/2608.01028v1) · [PDF](https://arxiv.org/pdf/2608.01028v1)
- **日期**: 2026-08-02 · **相关度**: 13
- **作者**: Dongfu Yin, Jinquan Zhang
- **标签**: VLA · Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Deploying Vision-Language-Action (VLA) robots as mobile edge nodes within wireless sensor networks (WSNs) requires robust protection against physical adversarial threats. We present VLAGuard, a framework to assess and mitigate a critical vulnerability: policy-critical action-to-vision attention hijacking. We first introduce a stress-test module, Visuomotor Attention-guided Semantic Attack (VASA), using printable patches to severely distract the robot's action-conditioned cross-attention. To counter this, we propose Attention-Protective Fine-Tuning (APFT), a defense that stabilizes spatiotemporal attention and enforces geometric consistency with zero inference overhead. Evaluations across…

## 83. Continual-RL for Generalization in Autonomous Racing on the RoboRacer Platform

- **arXiv**: [2607.24320](https://arxiv.org/abs/2607.24320v1) · [PDF](https://arxiv.org/pdf/2607.24320v1)
- **日期**: 2026-07-27 · **相关度**: 13
- **作者**: Joel Siegert, Edoardo Ghignone, Michele Magno
- **标签**: Offline RL · Real robot
- **与主线的关系**: 关注离线失败/次优数据的再利用，降低真实交互成本
- **摘要摘录**: A key challenge in modern robotics is to adapt to changing environments, a challenge that is exacerbated when simulations cannot encompass every possible real-world configuration, and therefore Reinforcement Learning (RL) in the physical world becomes necessary. Continual Reinforcement Learning provides the tools to address this challenge; however, both the frameworks and the methods remain underexplored. Autonomous Racing and in particular the RoboRacer competition provide a testing ground for such methods, as learning to drive on a new track-floor combination with the least amount of new experience naturally frames a continual learning problem. This work tries to address this gap by…

## 84. Beyond Pairwise Feedback: Listwise Vision-Language Supervision for Preference-Based Reward Learning

- **arXiv**: [2608.25350](https://arxiv.org/abs/2608.25350v1) · [PDF](https://arxiv.org/pdf/2608.25350v1)
- **日期**: 2026-08-26 · **相关度**: 12
- **作者**: Srivalli Katkuri, Maxwell Kawada, Juan Wachs
- **标签**: Robot RL
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Vision-language models (VLMs) have emerged as a powerful source of supervision for reinforcement learning, enabling agents to leverage rich semantic knowledge during training. Inspired by the success of preference-based reward learning (PbRL) in reinforcement learning from human feedback (RLHF), vision-language model generated image-based preferences provide an effective source for learning reward functions. This can be done by visually comparing two outcomes through the Bradley-Terry (BT) model. However, this pairwise formulation utilizes only two observations at a time, despite VLMs being capable of ranking multiple candidates. The Plackett-Luce (PL) formulation can shape a reward model…

## 85. VLCP: Vision Language Control Policy Closed-Loop Code Replanning for Robot Manipulation

- **arXiv**: [2608.16978](https://arxiv.org/abs/2608.16978v1) · [PDF](https://arxiv.org/pdf/2608.16978v1)
- **日期**: 2026-08-17 · **相关度**: 12
- **作者**: Dhia Naouali, Minghan Wu, Claudia Wong, Abhinav Puthran, Omar G. Younis
- **标签**: Robot RL
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Turning a frontier vision-language model into a robot policy usually means fine-tuning it to emit an action representation it never saw in pretraining, which throws away much of the reasoning that made the model worth reaching for. We go the other way and keep the VLM frozen. It writes the policy as a short Python control function, with no demonstrations and no fine-tuning. Writing that code once is open-loop, though. Existing closed-loop methods react at the wrong level: they retry a fixed policy or pick a different subtask, but never rewrite the code that failed. VLCP closes the loop where the failure actually lives, on the control code, within a single episode. Every $K$ steps the VLM…

## 86. RoboStriker: Latent-Space Strategic Games for Autonomous Humanoid Boxing

- **arXiv**: [2608.16195](https://arxiv.org/abs/2608.16195v1) · [PDF](https://arxiv.org/pdf/2608.16195v1)
- **日期**: 2026-08-17 · **相关度**: 12
- **作者**: Kangning Yin, Kaige Liu, Zhe Cao, Wentao Dong, Weishuai Zeng, Tianyi Zhang, Qiang Zhang, Jingbo Wang, et al.
- **标签**: Real robot · Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Achieving human-level competitive intelligence and physical agility in humanoid robots remains a profound challenge, particularly in contact-rich and highly dynamic tasks such as boxing. While Multi-Agent Reinforcement Learning offers a principled framework for strategic interaction, its direct application to unstructured raw motor spaces inevitably leads to joint-level physical collapse, preventing the emergence of any viable combat tactics. To resolve this fundamental conflict between strategic exploration and physical feasibility, we formulate the humanoid combat task as a novel two-player latent-space zero-sum Markov game. Under standard regularity and approximate best-response…

## 87. Pre-training Visual Dexterity in Simulation

- **arXiv**: [2608.15917](https://arxiv.org/abs/2608.15917v2) · [PDF](https://arxiv.org/pdf/2608.15917v2)
- **日期**: 2026-08-16 · **相关度**: 12
- **作者**: Sarthak Kamat, Adam Rashid, Satvik Sharma, Aseem Doriwala, Chelsea Finn, Phillip Isola, C. Karen Liu
- **标签**: Real robot · Dexterity/Tactile
- **与主线的关系**: 扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Large-scale pre-training has made robot policy fine-tuning increasingly data-efficient, but this progress has largely been driven by datasets and embodiments built around simple parallel-jaw grippers. Dexterous, multi-fingered hands remain comparatively data-starved because real teleoperation is costly to scale, while human hand video is off-embodiment and requires lossy pose estimation and retargeting. We introduce Simulation Pre-training for Dexterity (SPD), a pre-training framework for dexterous manipulation that uses data entirely collected in simulation. In SPD, humans manipulate virtual objects inside a VR headset, enabling on-embodiment trajectories and robot-free collection. With…

## 88. Temporal Logic Guided Universal Task Representations for Reinforcement Learning

- **arXiv**: [2608.15509](https://arxiv.org/abs/2608.15509v1) · [PDF](https://arxiv.org/pdf/2608.15509v1)
- **日期**: 2026-08-16 · **相关度**: 12
- **作者**: Hao Zhang, Zhangli Zhou, Zhen Kan
- **标签**: Robot RL
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Task guided agents demonstrate strong performance in a wide range of complex tasks. However, most existing task representation algorithms are tailored to specific contexts and struggle to generalize across diverse scenarios. Moreover, they typically depend on gradient signals from reinforcement learning controllers to update their weights, which can degrade both representation quality and learning efficiency. To overcome these limitations, we propose LOTUS, a temporal logic inspired universal task representation framework that can be seamlessly integrated into any RL algorithm to enhance agent performance across diverse task settings. Specifically, we design a novel task representation…

## 89. V-Simba: Unleashing the Architectural Potential of RL in Visual Continuous Control

- **arXiv**: [2608.07870](https://arxiv.org/abs/2608.07870v1) · [PDF](https://arxiv.org/pdf/2608.07870v1)
- **日期**: 2026-08-08 · **相关度**: 12
- **作者**: Donghu Kim, Youngdo Lee, Hojoon Lee, Johan Obando-Ceron, Byungkun Lee, Aaron Courville, Pablo Samuel Castro, Jaegul Choo, et al.
- **标签**: Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: Improving sample efficiency remains a core challenge in reinforcement learning (RL), especially in real-world settings like robotics, where data collection is costly. This challenge is pronounced in visual RL, where high-dimensional inputs often obscure learning signals. While prior work in visual RL has focused on algorithmic solutions, such as better dynamics models or exploration strategies, recent advances in state-based RL show that architectural design alone can lead to significant gains in sample efficiency. This raises an important question: Can these architectural principles transfer to visual RL? In response, we introduce V-Simba, a simple yet effective visual RL architecture…

## 90. PRIMAL3: Pathfinding via Reinforcement and Imitation Multi-Agent Learning - Leveraging LaCAM3

- **arXiv**: [2608.04905](https://arxiv.org/abs/2608.04905v1) · [PDF](https://arxiv.org/pdf/2608.04905v1)
- **日期**: 2026-08-05 · **相关度**: 12
- **作者**: Chengyang He, Tanishq Duhan, Gadiel Sznaier Camps, Fangyuan Wang, Yuhong Cao, Jiankai Sun, Ge Sun, Mac Schwager, et al.
- **标签**: Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: We present PRIMAL3, an ultra-large-scale learning-based framework for multi-agent pathfinding (MAPF) that integrates reinforcement learning, topology-aware communication, LaCAM3-guided training, and PIBT-based action refinement. PRIMAL3 targets failures at topologically critical states, where agents must coordinate decisively around bottlenecks, dead ends, and persistent conflicts. Each agent is represented using features derived from cut vertices, dead-end regions, shortest-path distances, and blocking estimates. Two complementary graphs capture agent interactions: a same-direction following graph propagates multihop context along compatible paths, while a different-direction conflict…

## 91. Explainable Reinforcement Learning via Physics-Aware Policy Distillation

- **arXiv**: [2607.24672](https://arxiv.org/abs/2607.24672v1) · [PDF](https://arxiv.org/pdf/2607.24672v1)
- **日期**: 2026-07-27 · **相关度**: 12
- **作者**: Shaker Al-Tamari, Waled Kadour
- **标签**: Value/Q · Distillation
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: In safety-critical sectors such as robotics and automotive engineering, the deployment of Deep Reinforcement Learning (DRL) is often hindered by the black-box nature of deep neural networks. This lack of transparency poses significant challenges for regulatory compliance and human-agent trust. This paper presents an experimental study aimed at making high-performance continuous control DRL systems interpretable. A policy distillation framework is implemented using the classic Inverted Pendulum benchmark. A high-performance Twin Delayed DDPG (TD3) agent serves as an opaque, continuous teacher model, whose policy is distilled into an interpretable student surrogate based on a shallow…

## 92. Egocentric Station Holding of Robotic Fish in Unknown Turbulent Background Flow

- **arXiv**: [2607.24860](https://arxiv.org/abs/2607.24860v1) · [PDF](https://arxiv.org/pdf/2607.24860v1)
- **日期**: 2026-07-26 · **相关度**: 12
- **作者**: Xiaozhu Lin, Xu Huang, Hongru Dai, Xiaopei Liu, Junzhi Yu, Yang Wang
- **标签**: Value/Q · Real robot
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度
- **摘要摘录**: Approaching a target position and holding station in flowing water is a fundamental and critical capability for robotic fish operating in natural aquatic environments. Despite decades of advances in enhancing swimming efficiency and maneuverability, this capability remains underdeveloped, largely owing to the insufficiently characterized, highly nonlinear fluid-structure interactions inherent to freely swimming robotic fish in flows. To bridge this gap, we propose the SWiFT framework, a Swimming With Flow Toolbox that enables the efficient exploration of an egocentric station-holding policy for a body and/or caudal fin (BCF) robotic fish in unknown and turbulent background flows via…

## 93. Towards Miniature Humanoid Tele-Loco-Manipulation Using Virtual Reality and Reinforcement Learning

- **arXiv**: [2607.20399](https://arxiv.org/abs/2607.20399v1) · [PDF](https://arxiv.org/pdf/2607.20399v1)
- **日期**: 2026-07-22 · **相关度**: 12
- **作者**: Nicolas Kosanovic, Jordan Dowdy, Jean Chagas Vaz
- **标签**: Robot RL
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Full-sized humanoid robot capabilities have grown exponentially in recent years, aiming towards general-purpose deployment in human environments. A popular control method used by manufacturers utilizes Virtual Reality for upper-body teleoperation and Reinforcement Learning for lower-body balance and locomotion control. As a result, a single remote operator can see, manipulate, and navigate about a real, distant physical environment. This powerful control stack is often relegated to expensive full-sized robots, many of which are inaccessible to the research community. Miniature humanoids are more prevalent, but employ less biomimicry in their design (e.g. fewer sensors, Degrees of Freedom,…

---
监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。
