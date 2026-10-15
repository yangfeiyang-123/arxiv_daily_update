# Robot Manipulation RL Post-Training Daily Watch · 2026-10-15

> 本次发现 **2** 篇此前从未推送的新论文。
> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。

## 1. VLRLA: Deployment-Time Adaptation of Vision-Language-Action Models through In-Context Reinforcement Learning

- **arXiv**: [2610.19517](https://arxiv.org/abs/2610.19517v1) · [PDF](https://arxiv.org/pdf/2610.19517v1)
- **日期**: 2026-10-14 · **相关度**: 32
- **作者**: Diyuan Shi, Yiqi Tang, Hongyin Zhang, You Wu, Donglin Wang
- **标签**: VLA · Real robot
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: Vision-language-action (VLA) models connect visual perception and language understanding with robot control, providing a foundation for instruction-conditioned manipulation. However, conventional pretrained VLA policies lack a mechanism for gradual adaptation through accumulated interaction experience during deployment. We therefore propose VLRLA, a general framework that equips existing VLA models with \textit{in-context reinforcement learning} capabilities for deployment-time adaptation. Our approach augments a VLA model with a reinforcement learning module that learns from historical observations, actions, rewards, and termination signals. During deployment, the policy gradually refines…

## 2. Post-Training, Finetuning, and Steering:A Field Guide for Curating Training Data

- **arXiv**: [2610.19143](https://arxiv.org/abs/2610.19143v1) · [PDF](https://arxiv.org/pdf/2610.19143v1)
- **日期**: 2026-10-13 · **相关度**: 23
- **作者**: Maria Attarian, Yifan Ruan, Claas Voelcker, Chenyang Cao, Amy Zhang, Peter Stone, Nicholas Rhinehart, Igor Gilitschenski
- **标签**: VLA · Offline RL · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本；直接面向 VLA/机器人基础策略的后训练
- **摘要摘录**: While Vision-Language-Action models have enabled impressive cross-task transfer in zero-shot settings, \emph{adaptation} methods are often necessary to achieve consistent performance on novel tasks. However, even though a wealth of methods for adaptation have been proposed, it is unclear how to choose the best method based on available trajectories. We close this gap by studying the impact of the adaptation method under a variety of common data scenarios: on- and off-policy data, offline vs online adaptation, and whether the data contains optimal or suboptimal trajectories. Our evaluation spans simulated tasks in the LIBERO suite and real tasks on a Franka platform. In the offline data…

---
监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。
