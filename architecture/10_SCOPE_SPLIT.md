# Scope split: Datapass vs future Dev/Ops sibling

The following ideas are deliberately parked outside Datapass V1:

- full terminal/PTY curriculum;
- Linux shell training;
- Git Lab;
- Bash/PowerShell course;
- SSH lab;
- Docker lab;
- IaC/OpenTofu/Terraform lab;
- Kubernetes lab;
- generic CI/CD learning.

They form a coherent possible **future Dev/Ops Workbench** and should not be lost, but they should not expand Datapass while V1 is unfinished.

Datapass may still invoke bounded product-owned commands required by its own workflows, such as reviewed dbt Core jobs. That is implementation infrastructure, not a terminal curriculum.

Do not extract a shared framework now. Finish Datapass V1 first; later reuse proven workbench primitives if a sibling product is actually started.
