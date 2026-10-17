# Robot Manipulation RL Post-Training Daily Watch · 2026-10-17

> 本次发现 **2** 篇此前从未推送的新论文。
> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。

## 1. Value as Memory: Online Value-Guided Post-training for General Robot Policies

- **arXiv**: [2610.22368](https://arxiv.org/abs/2610.22368v1) · [PDF](https://arxiv.org/pdf/2610.22368v1)
- **日期**: 2026-10-15 · **相关度**: 25
- **作者**: Wenye Yu, Yijin Chen, Kaiyi Xiong, Wenbo Han, Wendi Chen, Yang Jin, Han Xue, Jun Lv, et al.
- **标签**: Online RL · Offline RL · Real robot · Dexterity/Tactile
- **与主线的关系**: 与 RL-100 相近：采用 offline-to-online 数据飞轮；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Real-world post-training of generalist robot policies faces two challenges: partial observability makes action selection ambiguous, while offline post-training methods delay feedback from deployment experience. We present Value as Memory (VaM), a framework that addresses these challenges through value caching and online real-world reinforcement learning (RL). Value caching conditions actions on recent value predictions as task-progress memory, while online updates enable timely policy improvement by combining offline demonstrations, off-policy interventions, and on-policy rollouts for sample-efficient adaptation. As a result, VaM transitions from offline RL warmup to online autonomous…

## 2. Sim-to-Real Reinforcement Learning for Path-Safe Target Reaching in Robotic Harvesting of Hydroponic Lettuce

- **arXiv**: [2610.22337](https://arxiv.org/abs/2610.22337v1) · [PDF](https://arxiv.org/pdf/2610.22337v1)
- **日期**: 2026-10-15 · **相关度**: 24
- **作者**: Al Bashir, Partho Ghose, Yibin Wang, Robert G. Hardin, Joshua Peeples, Genhua Niu, Azlan Zahid
- **标签**: Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Robotic harvesting requires precise manipulation to ensure accurate positioning of the end-effector, especially in a constraint workspace. This study introduces the Path-Safe Approach Proximal Policy Optimization (PSA-PPO), a target-conditioned local reaching framework designed for robotic harvesting of nutrient film technique (NFT)-hydroponic lettuce in greenhouses. The proposed PSA-PPO preserves the standard clipped PPO objective while introducing a harvesting-oriented policy formulation that integrates target-conditioned observations, corridor-aware spatial constraints, trajectory-history-based safety encoding, and task-specific success criteria for constrained robotic manipulation.…

---
监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。
