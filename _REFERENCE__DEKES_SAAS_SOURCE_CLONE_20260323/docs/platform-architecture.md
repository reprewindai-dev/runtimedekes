# Platform Architecture & Positioning
This document establishes DEKES as the acquisition SaaS, ECOBE Engine as the intelligence/control plane, and ECOBE Dashboard as the operator visibility layer, including the integration contract between them.

## System Roles
- **DEKES (Acquisition SaaS)**
  - Multi-tenant org signup/login, session management, and RBAC
  - Lead search orchestration, generation runs, enrichment roadmap
  - Stripe-driven subscriptions, plan/usage quotas, lead storage
  - Acts as a standalone revenue product *and* optional eco-system entry point sending qualified demand downstream
- **ECOBE Engine (Control Plane / Intelligence)**
  - Carbon-aware workload optimization (carbon command, adaptive routing)
  - Outcome verification loops, accuracy tracking, workload intelligence
  - Consumes qualified demand from DEKES but operates independently
- **ECOBE Dashboard (Operator Visibility)**
  - Human-facing control surface for ECOBE Engine operators
  - Surfaces command history, accuracy metrics, benchmark data, ops observability
  - Must remain decoupled from DEKES so the engine is operable even without the acquisition layer

### Directional Flow
```
DEKES (acquisition SaaS)
   ↓ creates customers / sends qualified demand
ECOBE Engine (control plane)
   ↓ exposes telemetry & oversight
ECOBE Dashboard (operator console)
```
ECOBE never depends on DEKES to function; DEKES augments the pipeline by feeding qualified accounts, demo triggers, and outcome data.

### Monetization & GTM Positioning
- **DEKES**: Market-facing AI buyer-intent SaaS with subscription revenue, premium UI, and quota-driven plans
- **ECOBE Engine**: Carbon-aware compute infrastructure, enterprise contracts, API-first
- **ECOBE Dashboard**: Add-on for operators/SREs to govern ECOBE Engine deployments
- Pursue both GTM motions: sell DEKES independently *and* use it internally for ECOBE demand generation

## Production Gap Checklist for DEKES
These items are mandatory before labeling DEKES “production-grade”: 
1. **Quota Enforcement & Usage Tracking** – No lead run should exceed plan quotas; reset cycles must be automated.
2. **Analytics & Reporting** – Real conversion funnels, run performance, and cohort metrics surfaced via API + dashboard.
3. **Feedback / Outcome Loop** – Capture outreach attempts, wins/losses, and feed them into scoring weights + templates.
4. **Enrichment Upgrades** – Move beyond raw SerpAPI data; integrate contact enrichment, Groq intent classification, proof extraction.
5. **RBAC & Admin Controls** – Organization member management, role-restricted UI, billing override console, audit trails.
6. **Platform Hardening** – Rate limiting, monitoring/alerting, auth lifecycle (email verification, password reset, session revocation), deployment & infra validation.

## DEKES ↔ ECOBE Integration Contract
1. **Tenant Provisioning**
   - When an organization upgrades in DEKES, optionally create/mirror a tenant in ECOBE Engine via API, tagging source = DEKES.
2. **Qualified Lead Handoff**
   - Payload: organizationId, account metadata, intent score, carbon relevance signals, proof links, run context.
   - Delivery: Webhook or queue message into ECOBE ingestion endpoint with retries + signing.
3. **Demo / Onboarding Trigger**
   - Stripe success or “high intent” lead in DEKES triggers ECOBE demo scheduling or automatic sandbox creation.
4. **Usage & Conversion Feedback**
   - ECOBE Engine reports back activation/conversion data so DEKES learning loop can reward high-performing queries/templates.
5. **Attribution & Analytics**
   - Shared correlation IDs tie DEKES runs to ECOBE deals for MRR attribution and closed-loop analytics.
6. **Operational Guardrails**
   - Integration must tolerate either system running solo; feature flags determine whether DEKES sends leads downstream in a given environment.

Implementing this contract will let DEKES function both as a standalone SaaS and as the internal acquisition engine for ECOBE without introducing tight coupling.
