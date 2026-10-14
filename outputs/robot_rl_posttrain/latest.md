# Robot Manipulation RL Post-Training Daily Watch · 2026-10-14

> 本次发现 **11** 篇此前从未推送的新论文。
> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。

## 1. Recovering Low-Bit Failures in Vision-Language-Action Policies via Quantization-Conditioned Reinforcement Learning

- **arXiv**: [2610.15675](https://arxiv.org/abs/2610.15675v1) · [PDF](https://arxiv.org/pdf/2610.15675v1)
- **日期**: 2026-10-11 · **相关度**: 39
- **作者**: Seongmin Park, Jaewon Lee, Yujun Heo, Yoonsik Kim, Seheon Choi, Hyoung-rock Kim, Jungwook Choi
- **标签**: VLA · Offline RL · Real robot · Distillation
- **与主线的关系**: 关注离线失败/次优数据的再利用，降低真实交互成本；直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Quantization lowers deployment costs of vision-language-action (VLA) policies but can compromise task completion. Across five VLA models and 4,050 real-world trials, we systematically reveal that quantization-aware training (QAT) generally improves on post-training quantization (PTQ) but leaves substantial gaps to full precision (FP) on long-horizon tasks and under visual and semantic shifts, while its imitation-based objective does not explicitly use rollout success or partial completion. To exploit these outcome signals, we introduce Quantization-Conditioned Reinforcement Learning (QCRL), an offline RL method coupling progress-based advantage estimation with quantization-aware source…

## 2. CFG-Policy: Unified Diffusion Policy Learning Framework via Classifier-free Guidance

- **arXiv**: [2610.14936](https://arxiv.org/abs/2610.14936v1) · [PDF](https://arxiv.org/pdf/2610.14936v1)
- **日期**: 2026-10-10 · **相关度**: 37
- **作者**: Shutong Ding, Zhaoyang Liu, Yimiao Zhou, Jingya Wang, Jiayuan Gu, Ye Shi
- **标签**: VLA · Diffusion · Online RL · Model-based
- **与主线的关系**: 关注真实或仿真在线交互后的策略提升；直接面向 VLA/机器人基础策略的后训练；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Diffusion policies are increasingly used in robotic control and manipulation, vision-language-action models, and world-model-based agents. Their ability to represent multimodal action distributions offers rich opportunities for exploration in reinforcement learning (RL). However, optimizing diffusion policies with RL can reduce the behavioral diversity and further limit their exploration capability. In RL post-training, directly fine-tuning a pretrained policy may also disrupt its acquired capabilities, while action-space residuals may lack the expressive power for multimodal exploration. Together, these issues reveal a common challenge across online and offline-to-online diffusion RL:…

## 3. WoVR+: World Model as Reliable Simulator for Versatile VLA Policy Optimization with RL

- **arXiv**: [2610.17922](https://arxiv.org/abs/2610.17922v1) · [PDF](https://arxiv.org/pdf/2610.17922v1)
- **日期**: 2026-10-13 · **相关度**: 35
- **作者**: Shangqing Zhou, Zhennan Jiang, Ning Ma, Xin Fu, Yupeng Zheng, Shuai Tian, Huangrui Li, Jiahao Liu, et al.
- **标签**: VLA · Flow · Real robot · Model-based
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Action-conditioned world models can reduce costly real-robot interaction in reinforcement learning for Vision-Language-Action models (VLA-RL), but hallucinations can mislead policy optimization. Extending them to richer VLA interfaces and long-horizon tasks raises challenges in spatiotemporal and cross-modal consistency, exploration-reliability balance in RL, and compounding rollout errors. We present WoVR+, extending WoVR's hallucination-aware WM-RL framework by redesigning the learned environment and imagined interaction protocol: A VLA-interface-aligned world model provides multi-view prediction and proprioceptive updates while mitigating hallucinations. Chunk-wise noise preserves…

## 4. Trust-Calibrated VLA Policy Post-Training with Evolving Imagination

- **arXiv**: [2610.16517](https://arxiv.org/abs/2610.16517v1) · [PDF](https://arxiv.org/pdf/2610.16517v1)
- **日期**: 2026-10-12 · **相关度**: 34
- **作者**: Wenzhan Li, Yiran Qin, Heng Zhou, Huirui Wang, Yulan Guo, Ruimao Zhang
- **标签**: VLA · Model-based
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Vision-Language-Action (VLA) models are often pretrained via imitation learning, making reinforcement learning (RL) post-training important when deployment moves beyond demonstration coverage. Existing refinement paradigms expose a reliability--efficiency tension: model-free refinement avoids simulator bias but is interaction-intensive, whereas model-based refinement can exploit unreliable imagination even as its simulator adapts. We propose Model-Evolving Reinforcement Learning (MERL), a trust-calibrated framework that couples policy optimization with an online-updated simulator comprising a world model and a reward proxy head. Across stages, simulator reliability controls the…

## 5. Compositional Average Velocity Modeling for Efficient Diffusion Offline Reinforcement Learning

- **arXiv**: [2610.14941](https://arxiv.org/abs/2610.14941v1) · [PDF](https://arxiv.org/pdf/2610.14941v1)
- **日期**: 2026-10-10 · **相关度**: 28
- **作者**: Thanh Nguyen, Abu Hanif Muhammad Syarubany, Hwanhee Kim, Chang D. Yoo
- **标签**: Offline RL · Value/Q · Real robot · Distillation
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Diffusion-based policies have recently emerged as a powerful paradigm for offline reinforcement learning, but their reliance on multi-step denoising introduces substantial computational overhead and requires backpropagation through time during training, limiting scalability and practical deployment. In this work, we propose \textbf{Instant Flow Q-Learning (InsQL)}, a single-step generative policy learning framework that retains the expressive capacity of diffusion models while eliminating iterative sampling and BPTT. InsQL builds on the flow-matching perspective of diffusion policies, but replaces marginal velocity parameterization with \emph{average-velocity} modeling and introduces a…

## 6. TRACE: Efficient Transfer Learning for Neural Whole-Body Control Across Humanoid Embodiments

- **arXiv**: [2610.17999](https://arxiv.org/abs/2610.17999v1) · [PDF](https://arxiv.org/pdf/2610.17999v1)
- **日期**: 2026-10-13 · **相关度**: 26
- **作者**: Qingyu Lan, Zhihao Tian, Zifan Wang, Junwei Liang
- **标签**: VLA · Real robot · Distillation
- **与主线的关系**: 直接面向 VLA/机器人基础策略的后训练；解决后训练走向真实部署时的推理延迟或单步化问题
- **摘要摘录**: Humanoid behavior foundation models (BFMs) enable diverse whole-body control, but adapting a pretrained controller to a new embodiment remains challenging because of kinematic and dynamic mismatch. We present TRACE, a framework for efficient cross-embodiment adaptation that preserves pretrained motion representations while specializing feedback control to the target robot.TRACE first injects kinematic priors into input and output projection layers and aligns nominal joint dynamics to reduce embodiment mismatch and support stable fine-tuning. It then combines encoder distillation with low-rank reinforcement learning on a compact, quality-screened motion set, using a two-phase curriculum to…

## 7. ACCRUE: Continual Off-Policy Reinforcement Learning for Robot Foundation Models

- **arXiv**: [2610.18596](https://arxiv.org/abs/2610.18596v1) · [PDF](https://arxiv.org/pdf/2610.18596v1)
- **日期**: 2026-10-13 · **相关度**: 24
- **作者**: Changyeon Kim, Kimin Lee, Yashraj Narang, Yijie Guo
- **标签**: Online RL · Offline RL · Value/Q · Real robot · Dexterity/Tactile
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；与 RL-100 相近：采用 offline-to-online 数据飞轮；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: Reinforcement learning (RL) post-training improves robot foundation models (RFMs) beyond their demonstrations, but real-world deployment demands more: learning new tasks efficiently while retaining previously acquired behaviors. Existing continual RL methods on top of VLAs mitigate forgetting but rely on on-policy updates with limited forward transfer, whereas off-policy methods improve single-task sample efficiency without addressing learner persistence across tasks. We propose ACCRUE, a continual off-policy RL framework that carries lightweight actor and critic networks across tasks, allowing each stage to reuse behavioral and value knowledge acquired through prior RL. The inherited…

## 8. Reinforcement Learning from Real-Robot Interaction without High-Quality State Estimates

- **arXiv**: [2610.14042](https://arxiv.org/abs/2610.14042v1) · [PDF](https://arxiv.org/pdf/2610.14042v1)
- **日期**: 2026-10-02 · **相关度**: 20
- **作者**: Ryan Gao, Ashvin Anilkumar, Nicholas Corrado, William Cong, Josiah Hanna
- **标签**: Value/Q · Real robot · Dexterity/Tactile
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；扩展到灵巧、触觉或接触丰富操作
- **摘要摘录**: A longstanding goal for robot reinforcement learning (RL) is that robots learn from their own physical experience, as humans and animals do. A key obstacle to learning directly from physical experience, especially outside instrumented lab environments, is that the state of the world is usually unobservable to the learner and must be estimated from on-board sensing. Errors in that estimate corrupt both the policy input and potentially the reward signal. We study this challenge using the contact-rich task of a bipedal robot learning to score soccer goals. We estimate all key state variables on-board with an unscented Kalman filter (UKF) and no external instrumentation (e.g., motion capture…

## 9. CALM: Decentralized Control of Cooperative Aerial Manipulation with Multi-Agent Reinforcement Learning

- **arXiv**: [2610.18425](https://arxiv.org/abs/2610.18425v1) · [PDF](https://arxiv.org/pdf/2610.18425v1)
- **日期**: 2026-10-13 · **相关度**: 18
- **作者**: Jiaxi Huo, Petre Ricioppo, Fausto Francesco Lizzio
- **标签**: Value/Q · Model-based
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；通过世界模型/数字孪生放大可用于 RL 的经验
- **摘要摘录**: Cooperative aerial manipulation is difficult under wind, payload motion, and noisy goal broadcasts because multiple Unmanned Aerial Vehicles (UAVs) are coupled through a shared payload. We present CALM (Cooperative Aerial Learned Manipulation), a decentralized controller for aerial manipulators carrying a basket while tracking a moving ground robot. CALM combines a parameter-shared Multi-Agent Reinforcement Learning (MARL) policy, trained using Multi-Agent Proximal Policy Optimization (MAPPO), with goal estimation, per-UAV Extended State Observers (ESOs), basket-mass estimation, and anticipatory formation-yaw feedforward. The anticipatory formation-yaw feedforward uses estimated goal…

## 10. DEFlow: Deep Equilibrium Flow Maximum-Entropy Reinforcement Learning

- **arXiv**: [2610.16597](https://arxiv.org/abs/2610.16597v1) · [PDF](https://arxiv.org/pdf/2610.16597v1)
- **日期**: 2026-10-12 · **相关度**: 18
- **作者**: Ruslan Ageev, Huaze Tang, Runqing Miao, Jiarong Li, Wenbo Ding
- **标签**: Flow · Offline RL · Value/Q
- **与主线的关系**: 用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度；关注离线失败/次优数据的再利用，降低真实交互成本
- **摘要摘录**: Expressive flow policies can represent multiple high-value actions, but sampling them with few integration steps while retaining tractable action densities remains challenging. We introduce DEFlow, a deep equilibrium flow policy that replaces explicit Euler sampling with implicit Euler integration and solves all intermediate actions jointly as an equilibrium system. We combine implicit differentiation with a discrete change-of-variables formula for the final-action density, enabling off-policy training within soft actor-critic without backpropagating through solver iterations. DEFlow achieves an average relative improvement of approximately 10% in mean successful coverage over the…

## 11. Sparse-TD-JEPA: Improving Zero-Shot Reinforcement Learning With Sparse Latent Task Representations

- **arXiv**: [2610.14400](https://arxiv.org/abs/2610.14400v1) · [PDF](https://arxiv.org/pdf/2610.14400v1)
- **日期**: 2026-10-09 · **相关度**: 15
- **作者**: Duaa Nakshbandi, Zhiyu An, Wan Du
- **标签**: Robot RL
- **与主线的关系**: 研究如何为机器人策略构造更有效的奖励或价值学习信号
- **摘要摘录**: Successor-feature-based zero-shot reinforcement learning methods pre-train a task encoder and successor-feature predictor on offline, reward-free data, then recover a policy at test time by solving a closed-form linear regression over a small labeled dataset. We identify an underexplored limitation of this approach: when the task encoder produces dense representations, the inferred reward signal becomes diffuse across the state space, reducing the contrast between goal-relevant states and the background and providing a weaker signal for the policy to follow. We address this limitation by introducing an l1 sparsity penalty that concentrates reward-predictive structure into a smaller…

---
监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。
