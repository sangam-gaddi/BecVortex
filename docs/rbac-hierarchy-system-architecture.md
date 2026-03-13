# Role-Based Hierarchy System Design and System Architecture

This document captures the role hierarchy, permission boundaries, and runtime architecture for the VORA/BEC platform.

## 1) Role Hierarchy Design (RBAC + Delegation)

```mermaid
flowchart TD
    MASTER[MASTER\nPlatform Owner] --> PRINCIPAL[PRINCIPAL\nInstitution Head]
    PRINCIPAL --> HOD[HOD\nDepartment Head]
    HOD --> OFFICER[OFFICER\nOperations/Admin]
    HOD --> FACULTY[FACULTY\nAcademic Staff]

    STUDENT[STUDENT\nSelf-Service Actor]

    MASTER -. create_account .-> PRINCIPAL
    PRINCIPAL -. create_account .-> HOD
    HOD -. create_account .-> OFFICER
    HOD -. create_account .-> FACULTY

    OFFICER -. cannot create .-> OFFICER
    FACULTY -. cannot create .-> FACULTY
    STUDENT -. no staff creation privileges .-> STUDENT
```

### Analysis

- The hierarchy is a controlled delegation tree, not a full inheritance graph of unlimited permissions.
- Account creation is intentionally narrow:
  - MASTER can create PRINCIPAL.
  - PRINCIPAL can create HOD.
  - HOD can create OFFICER and FACULTY.
- OFFICER and FACULTY are same depth peers in authority level for account governance, reducing lateral privilege escalation.
- STUDENT is intentionally outside staff creation hierarchy and is scoped to self-service functions and app launching.

## 2) Capability Matrix by Role (Functional RBAC)

```mermaid
flowchart LR
    subgraph A[Academic Domain]
      U1[upload_marks]
      U2[mark_absent]
      U3[assign_teaching]
      U4[assign_cr / revoke_cr]
    end

    subgraph B[Operations Domain]
      O1[list/approve/reject_registration]
      O2[admit_student]
      O3[bulk_assign_subjects]
      O4[create_account]
    end

    subgraph C[Student Domain]
      S1[submit_registration]
      S2[get_my_student_context]
      S3[get_my_fee_overview]
      S4[payment and receipt tools]
    end

    subgraph D[OS Command Domain]
      X1[open_app]
      X2[close_app]
    end

    MASTER --> O4
    MASTER --> X1
    MASTER --> X2

    PRINCIPAL --> O4
    PRINCIPAL --> X1
    PRINCIPAL --> X2

    HOD --> O4
    HOD --> U3
    HOD --> U4
    HOD --> X1
    HOD --> X2

    OFFICER --> O1
    OFFICER --> O2
    OFFICER --> O3
    OFFICER --> X1
    OFFICER --> X2

    FACULTY --> U1
    FACULTY --> U2
    FACULTY --> X1
    FACULTY --> X2

    STUDENT --> S1
    STUDENT --> S2
    STUDENT --> S3
    STUDENT --> S4
    STUDENT --> X1
    STUDENT --> X2
```

### Analysis

- Permissioning is capability-based and explicit per tool rather than implicit by hierarchy level.
- The model prevents over-entitlement:
  - Example: PRINCIPAL does not automatically gain FACULTY-only workflows unless explicitly assigned.
- Security benefit: reducing transitive permissions lowers blast radius during credential compromise.
- Operational benefit: role onboarding and audits map directly to tool lists, simplifying compliance checks.

## 3) Runtime System Architecture (Request to Action)

```mermaid
flowchart TD
    Client[Web UI / BEC OS App] --> API[Next.js API Route\napp/api/agent/chat/route.ts]
    API --> Session[Session Resolver\nJWT or Student Context]
    Session --> Prompt[System Prompt Builder\nrole-aware tool exposure]
    Prompt --> RBAC[RBAC Filter\ngetToolsForRole + student restrictions]
    RBAC --> LLM[LLM Tool Planning]

    LLM --> Exec[Tool Executor]
    Exec --> Guard[RBAC Guard\ncanUseTool + creation checks]
    Guard --> Actions[Server Actions\nadmission/attendance/grade/payment/etc]
    Actions --> DB[(MongoDB Models)]

    Exec --> Audit[(AgentAuditLog)]
    Actions --> Audit

    Exec --> OSCmd[OS Commands\nopen_app / close_app]
    OSCmd --> Client

    DB --> API
    API --> Client
```

### Analysis

- Defense-in-depth is present at multiple layers:
  - Tool exposure filtering before the model plans calls.
  - Executor-level RBAC check before invocation.
  - Domain/server-action guards enforcing role requirements.
- This layered approach is resilient to prompt drift and malformed tool-call attempts.
- Audit logging at execution level creates forensic traceability for sensitive operations like admissions and account creation.
- STUDENT flow is additionally constrained to context-first response behavior and reduced tool access, lowering unnecessary write-path exposure.

## 4) Data and Control Boundaries

```mermaid
flowchart LR
    subgraph UI[Presentation]
      P1[Next.js Pages]
      P2[BEC OS Frontend]
    end

    subgraph APP[Application Layer]
      A1[API Routes]
      A2[Agent Core\nPrompt/RBAC/Executor]
      A3[Server Actions]
    end

    subgraph DATA[Data Layer]
      D1[User]
      D2[Student]
      D3[Faculty]
      D4[Payment]
      D5[Grade]
      D6[RegistrationRequest]
      D7[AttendanceRecord]
      D8[AgentAuditLog]
    end

    P1 --> A1
    P2 --> A1
    A1 --> A2
    A2 --> A3
    A3 --> D1
    A3 --> D2
    A3 --> D3
    A3 --> D4
    A3 --> D5
    A3 --> D6
    A3 --> D7
    A2 --> D8
```

### Analysis

- Clean separation of concerns:
  - Presentation never writes directly to database.
  - Role checks are centralized before action execution.
  - Domain writes happen through action-specific services.
- AgentAuditLog sits as cross-cutting observability storage and should be retained with strict access policies.
- Indexing role + department in user data supports fast operational filtering and department-scoped governance.

## 5) Security and Scalability Recommendations

- Add policy versioning for RBAC snapshots so each audit record can reference the active policy state.
- Introduce deny-by-default policy tests for each tool on every role to prevent accidental permission expansion.
- Add department-aware constraints at tool layer for OFFICER workflows where business policy requires stricter scoping.
- Implement alerting on high-risk actions:
  - create_account
  - admit_student
  - bulk_assign_subjects
- For scale, isolate read-heavy student context and fee overview queries with caching while preserving strong consistency for write operations.

## 6) Summary

The architecture combines hierarchical account governance with capability-based tool authorization. This hybrid model avoids excessive privilege inheritance, supports clear operational boundaries, and provides strong auditability for institutional workflows.
