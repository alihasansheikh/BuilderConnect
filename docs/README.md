# BuilderConnect Documentation Index

> All documents extracted from source code analysis. Nothing assumed or invented.

## Documents

| # | Document | Purpose | Scope |
|---|----------|---------|-------|
| 00 | [Project Overview](00-project-overview.md) | What the system is, tech stack, scope | High-level summary, entry point |
| 01 | [Product Requirements](01-product-requirements.md) | Features, workflows, business rules | Roles, validations, state machines |
| 02 | [Domain Model](02-domain-model.md) | Entity fields, relationships | JPA entities, all 43 classes |
| 03 | [Architecture](03-architecture.md) | Layers, request flow, auth flow | Controller→Service→Repo patterns |
| 04 | [API Contracts](04-api-contracts.md) | Endpoint catalog | All ~110 REST endpoints |
| 05 | [Database Schema](05-database-schema.md) | SQL tables, columns, constraints | Flyway migrations V1-V24 |
| 06 | [Coding Standards](06-coding-standards.md) | Patterns, violations | Naming, DTOs, testing |

## Cross-Reference Guide

| Topic | Authoritative Doc | Referenced In |
|-------|-------------------|---------------|
| User roles & permissions | 01-product-requirements | 00, 03 |
| Entity fields & types | 02-domain-model | 05 |
| SQL column definitions | 05-database-schema | 02 |
| Status transitions | 01-product-requirements | 02, 04 |
| Endpoint catalog | 04-api-contracts | 01, 03 |
| Auth/JWT flow | 03-architecture | 01, 04 |
| Validation rules | 01-product-requirements | 04, 06 |
| Pattern violations | 06-coding-standards | 03, 04 |
| Tech stack versions | 00-project-overview | — |
| Flyway migrations | 05-database-schema | 00 |
| Business rules (fees, limits) | 01-product-requirements | 00 |
| JSON encoding issue | 02-domain-model | 05 |

## Reading Order

1. **Start here:** `00-project-overview.md` — understand what the system does
2. **Business logic:** `01-product-requirements.md` — features, workflows, rules
3. **Data model:** `02-domain-model.md` — entities and relationships
4. **How it works:** `03-architecture.md` — layers, auth, data flow
5. **API reference:** `04-api-contracts.md` — every endpoint
6. **Database:** `05-database-schema.md` — SQL tables and constraints
7. **Code quality:** `06-coding-standards.md` — patterns and violations
