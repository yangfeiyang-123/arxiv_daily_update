# Robot Manipulation RL Post-Training Daily Watch · 2026-10-12

> 本次发现 **2** 篇此前从未推送的新论文。
> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。

## 1. OGPO: Offline Goal-conditioned Policy Optimization for Recoverable Vision-Language-Action Models

- **arXiv**: [2610.12914](https://arxiv.org/abs/2610.12914v1) · [PDF](https://arxiv.org/pdf/2610.12914v1)
- **日期**: 2026-10-09 · **相关度**: 36
- **作者**: Xule Gao, Xi Wang, Zehua Zang, Rui Wang, Changwen Zheng, Chuxiong Sun
- **标签**: VLA
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models have shown strong promise in robotic manipulation, yet their post-training still predominantly relies on trajectory-level supervised imitation over robot demonstrations. While effective for learning feasible actions, this paradigm supervises policies to reproduce expert actions at each step, biasing them toward demonstration-specific action paths and providing limited guidance for recovering toward task-progress states once execution deviates from demonstrated trajectories. To address this limitation, we propose OGPO, an Offline Goal-conditioned Policy Optimization framework for recoverable VLA post-training. Instead of treating offline demonstrations…

## 2. Evo-RL: Iterative Robot Reinforcement Learning from Selective Experience

- **arXiv**: [2610.13345](https://arxiv.org/abs/2610.13345v1) · [PDF](https://arxiv.org/pdf/2610.13345v1)
- **日期**: 2026-10-09 · **相关度**: 18
- **作者**: Kai Ye, Yifan Jin, Qianhang Luo, Hongru Zhang, Jiedong Zhang, Shuyuan Hu, Song-Yuan Wu, Jihai Xu, et al.
- **标签**: Human-in-loop · Real robot
- **与主线的关系**: 属于机器人策略从模仿学习走向强化学习改进的同一技术链
- **摘要摘录**: Existing real-world reinforcement learning methods improve robot policies by combining human corrections with autonomous rollouts. However, accumulated experience varies in its value for policy improvement, and even successful trajectories can contain inefficient or redundant behavior, motivating more selective experience reuse. To this end, we propose Evo-RL, an iterative reinforcement learning method that combines human interventions with advantage-guided experience selection. Evo-RL uses human corrections and experience with positive estimated advantages from successful trajectories to iteratively refine the policy. To support learning from these different experience sources, we…

---
监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。
