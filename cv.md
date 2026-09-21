# Louis Ross

Cloud Infrastructure Engineer — Azure, AWS & Infrastructure Automation

United Kingdom | louisross980@gmail.com | (+44) 07592 760393 | linkedin.com/in/louis-ross | github.com/rossy167

## Summary

Cloud infrastructure engineer with 5+ years administering and automating Azure and AWS environments across SaaS and enterprise settings. Experienced in Infrastructure as Code with Terraform, identity and access management, endpoint management, security and compliance, and operational monitoring. Scripting experience across PowerShell, Python, and Bash. BSc Computer Science, University of Hertfordshire.

## Skills / Core Competencies

- **Microsoft Azure** — IaaS/PaaS: VMs, networking, storage, App Services
- **AWS** — EC2, VPC, S3, IAM
- **GCP** — VM management, IAM
- **Infrastructure as Code** — Terraform, hybrid cloud environments
- **Identity & Access (IAM)** — Entra ID / Azure AD, Active Directory, Okta, RBAC, conditional access, MFA, SCIM provisioning, identity lifecycle management
- **Endpoint Management (MDM)** — Microsoft Intune, Autopilot, SCCM, Jamf, Samsung Knox, ChromeOS, Google Workspace, Windows Server, DNS, DHCP, Group Policy
- **Automation & Scripting** — PowerShell, Python, Bash, Node.js for provisioning, diagnostics and operational tooling
- **Monitoring & Incident** — Prometheus, Grafana, New Relic, CloudWatch, alerting pipelines, incident management, 24/7 on-call, SLA-driven operations
- **Security & Compliance** — ISO 27001, Cyber Essentials, vulnerability management, penetration testing coordination, simulated phishing campaigns

## Experience

### System Administrator — Inspiro Learning
*Jul 2024 – Present*

- Administer and maintain Azure cloud infrastructure across a distributed enterprise environment, including an Azure-to-Azure migration of approximately 500 users, while managing security posture, governance controls, and platform improvements alongside an external MSP.
- Manage Entra ID for the full identity lifecycle: user and group provisioning, conditional access policies, RBAC, MFA enforcement, and SCIM-based SSO integrations.
- Contribute to ISO 27001 and Cyber Essentials compliance, supporting evidence packs, control mapping, and audit readiness.
- Develop PowerShell automation scripts for provisioning, diagnostics, and operational reporting.
- Manage Intune and Autopilot for Windows device fleet management; administer Samsung Knox for Android devices; coordinate Windows 11 enterprise migration.
- Maintain technical documentation and runbooks for infrastructure processes and stakeholder handoffs.

### System Administrator — Bob's Business Limited
*Jun 2022 – Apr 2024*

- Managed AWS cloud infrastructure (EC2, VPC, S3, IAM) as the primary cloud platform for a cybersecurity SaaS business, maintaining reliability, security, and performance across production environments.
- Used Terraform for infrastructure-as-code deployments across development, staging, and production environments.
- Implemented monitoring and alerting using Prometheus, Grafana, and New Relic; participated in 24/7 on-call support, consistently resolving critical incidents within SLA.
- Contributed to ISO 27001 and Cyber Essentials compliance; provided 3rd line technical support across infrastructure, identity, and access control.
- Administered Jamf for macOS and iPad device management; managed ChromeOS and Google Workspace.
- Developed Python and Node.js automation scripts in production for incident response and operational workflows.

### IT Support Analyst — Utility Warehouse (Telecom Plus PLC)
*Jun 2018 – Nov 2021*

- Administered Active Directory, SCCM, and Jamf across a 1,500+ user enterprise estate; managed DNS, DHCP, Group Policy, Hyper-V, and Windows Server environments.
- Administered Okta for identity and access management across permissions and devices.
- Developed PowerShell automation scripts to reduce manual administration overhead.
- Supported AWS infrastructure migration using Terraform and Desired State Configuration (DSC).
- Delivered Tier 1 and Tier 2 support across hardware, software, and connectivity issues.
- Worked within ServiceNow and Jira for incident management, queue administration, and escalation tracking.

## Projects

### cloud-monitoring-stack
*Terraform / Docker / Grafana*

A self-hosted Prometheus + Grafana stack on a free-tier GCP e2-micro, provisioned entirely by Terraform with GCS-backed remote state. Alertmanager routes real alert rules for host resource pressure, probe failures, and container restarts to a configurable webhook; per-container memory limits and a tuned swapfile keep it stable inside 1GB of RAM. It also watches this site's own uptime and TLS cert.

GitHub: github.com/rossy167/cloud-monitoring-stack

### k3s-observability-lab
*Kubernetes / kind / GitHub Actions*

Kubernetes manifests for a Prometheus + Grafana observability stack, built as a companion to cloud-monitoring-stack after a feasibility check found k3s's control-plane memory footprint doesn't fit alongside the existing Docker Compose workload on that free-tier 1GB VM. Every container defines resource requests and limits plus readiness and liveness probes. Tested on every push via an ephemeral kind cluster spun up fresh in GitHub Actions, with no live cloud resource and no ongoing cost.

GitHub: github.com/Rossy167/k3s-observability-lab

### steam-blocker
*C#*

A lightweight Windows utility that blocks Steam's network access via Windows Firewall rules, letting multiple people use Family Sharing offline on the same network at the same time.

GitHub: github.com/rossy167/steam-blocker

### win10-setup-script
*PowerShell*

A repeatable PowerShell build script for provisioning a clean Windows 10 install, handling debloating, privacy hardening, and standard tooling installs in one run instead of a dozen manual steps.

GitHub: github.com/rossy167/win10-setup-script

## Education

**BSc Computer Science** — University of Hertfordshire (2016 – 2021)

## Certifications

Microsoft Certified: Azure Administrator Associate (AZ-104) — in progress
