# BuilderConnect v2

**Smart Construction Marketplace & Project Lifecycle Management Platform**

A comprehensive full-stack platform connecting clients with construction professionals in Pakistan, built with modern software engineering practices.

![BuilderConnect](BuilderConnect-logo.png)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Demo Credentials](#demo-credentials)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

BuilderConnect v2 is a marketplace platform that enables:
- **Clients** to post construction projects and manage them through completion
- **Builders** to bid on projects and manage their work pipeline
- **Suppliers** to list materials and fulfill orders
- **Support agents** to handle tickets and disputes
- **Admins** to manage the platform

The platform has six user roles: `CLIENT`, `BUILDER`, `SUPPLIER`, `SUPPORT_AGENT`, `ADMIN`, and `SUPER_ADMIN`.

### Key Highlights

- Multi-role authentication with JWT
- Real-time chat via WebSocket
- Milestone direct payments (client pays with proof, builder confirms)
- Milestone-driven project lifecycle
- Review and rating system
- Comprehensive admin tools

---

## Features

### For Clients
- Post construction projects with detailed requirements
- Receive and compare bids from builders
- Award projects and manage milestones
- Record milestone payments with proof of payment
- Chat with builders in real-time
- Review completed work

### For Builders
- Browse marketplace for projects
- Submit detailed proposals with milestones
- Track bid status and project pipeline
- Submit milestone completion requests
- Build reputation through reviews
- Manage lead credits for bidding

### For Suppliers
- List construction materials catalog
- Receive and fulfill material orders
- Manage delivery tracking
- Process quote requests

### For Platform
- Milestone-by-milestone payment tracking
- Dispute resolution and support ticket system
- Badge and achievement system
- AI suite: public FAQ chatbot, AI assistant, and floor-plan generation studio

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 17 | Programming Language |
| Spring Boot | 3.2.1 | Application Framework |
| Spring Security | 6.x | Authentication & Authorization |
| Spring Data JPA | 3.x | Data Access Layer |
| Hibernate | 6.x | ORM |
| H2 Database | 2.x | In-Memory Database (MySQL compat mode) |
| Flyway | 9.x | Database Migration |
| JWT (jjwt) | 0.12.3 | Token Authentication |
| WebSocket/STOMP | - | Real-time Communication |
| SpringDoc OpenAPI | 2.3.0 | API Documentation |
| Lombok | - | Boilerplate Reduction |
| JUnit 5 | - | Testing Framework |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| TailwindCSS | 3.x | Styling |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Server State Management |
| Axios | 1.x | HTTP Client |
| STOMP.js | - | WebSocket Client |
| Sonner | - | Toast Notifications |
| Radix UI | - | Accessible Components |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages   │  │Components│  │ Contexts │  │   API Services   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP/WebSocket
┌────────────────────────────────▼────────────────────────────────┐
│                        Backend (Spring Boot)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Controllers (REST API)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Services (Business Logic)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Repositories (Data Access)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Security   │  │  WebSocket  │  │   Mock Adapters         │  │
│  │  (JWT)      │  │  (STOMP)    │  │   (Email, Payment)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                    H2 In-Memory Database                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐ │
│  │ Users  │ │Projects│ │  Bids  │ │Payments│ │ Chat/Messages  │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Java 17** or higher
- **Node.js 18** or higher
- **Maven 3.8** or higher
- **Git**

> **No external database required!** The project uses an H2 in-memory database that starts automatically with the backend. All tables are created via Flyway migrations and seed data is loaded on every startup.

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Build and run:
```bash
mvn spring-boot:run
```

That's it! The backend will:
- Start on `http://localhost:8080`
- Create an H2 in-memory database automatically
- Run all Flyway migrations (V1–V47)
- Load seed data with test users, projects, bids, and more

> **Note:** Since H2 is in-memory, the database resets every time you restart the backend. This means you always start with clean seed data.

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Running Both Together

Open two terminal windows:

```bash
# Terminal 1 — Backend
cd backend
mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Running Tests

```bash
# Backend tests
cd backend
mvn test

# Frontend tests
cd frontend
npm test
```

---

## Project Structure

```
BuilderConnect Version x/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/builderconnect/
│   │   │   │   ├── config/           # Configuration classes
│   │   │   │   ├── controller/       # REST controllers
│   │   │   │   ├── dto/              # Data Transfer Objects
│   │   │   │   │   ├── request/      # Request DTOs
│   │   │   │   │   └── response/     # Response DTOs
│   │   │   │   ├── entity/           # JPA entities
│   │   │   │   ├── enums/            # Enumeration types
│   │   │   │   ├── exception/        # Custom exceptions
│   │   │   │   ├── repository/       # Data repositories
│   │   │   │   ├── security/         # Security configuration
│   │   │   │   └── service/          # Business services
│   │   │   └── resources/
│   │   │       ├── db/migration/     # Flyway SQL migrations
│   │   │       └── application.yml   # Application config
│   │   └── test/                     # Test classes
│   └── pom.xml                       # Maven configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Reusable components (layout/, ui/, project/)
│   │   ├── contexts/                 # React contexts
│   │   ├── hooks/                    # Custom hooks
│   │   ├── lib/                      # Utilities and formatters
│   │   ├── pages/                    # Page components
│   │   │   ├── admin/, auth/, builder/, client/, public/
│   │   │   └── shared/, supplier/, support/
│   │   ├── services/                 # API services
│   │   ├── types/                    # TypeScript types
│   │   ├── App.tsx                   # Main app component
│   │   └── main.tsx                  # Entry point
│   ├── package.json                  # NPM configuration
│   └── vite.config.ts                # Vite configuration
│
├── docs/
│   ├── api/
│   │   ├── openapi.yaml              # OpenAPI specification
│   │   └── BuilderConnect.postman_collection.json
│   └── images/
│
├── LICENSE                           # Proprietary license
└── README.md                         # This file
```

---

## API Documentation

### Swagger UI
Once the backend is running, access the interactive API documentation at:
```
http://localhost:8080/api/swagger-ui.html
```

### OpenAPI Specification
The OpenAPI 3.0 specification is available at:
```
http://localhost:8080/api/v3/api-docs
```

Or view the static specification at `docs/api/openapi.yaml`

### Postman Collection
Import `docs/api/BuilderConnect.postman_collection.json` into Postman for ready-to-use API requests.

### Key API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/auth/register` | Register new user | No |
| POST | `/v1/auth/login` | Login user | No |
| GET | `/v1/auth/me` | Get current user | Yes |
| POST | `/v1/client/projects` | Create project | Client |
| GET | `/v1/projects` | Search projects | Yes |
| POST | `/v1/builder/bids` | Submit bid | Builder |
| GET | `/v1/chat/rooms` | Get chat rooms | Yes |
| POST | `/v1/chat/rooms/{id}/messages` | Send message | Yes |

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and profiles |
| `builder_profiles` | Extended builder information |
| `supplier_profiles` | Extended supplier information |
| `projects` | Construction projects |
| `bids` | Builder proposals |
| `milestones` | Payment phases |
| `chat_rooms` | Chat conversations |
| `chat_messages` | Chat messages |
| `reviews` | Ratings and reviews |
| `badges` | Achievement definitions |
| `notifications` | In-app notifications |

### Migration Files

Located in `backend/src/main/resources/db/migration/` — Flyway migrations `V1` through `V47` create the full schema and seed data (users, projects, bids, materials, CMS content, email templates, system settings, and more) on every startup.

---

## Testing

### Backend Tests

```bash
cd backend
mvn test
```

Current test classes (36 tests total): `AuthServiceTest`, `ProjectServiceTest`, `AuthControllerTest`, `JwtTokenProviderTest`, `RateLimitFilterTest`, `BuilderConnectApplicationTests`.

> Frontend has Vitest configured but no test files yet.

### Test Configuration

Both development and tests use H2 in-memory database — no external database setup needed.

---

## Demo Credentials

The seed data (loaded automatically on startup) includes test users for all roles. All passwords are **`password`** (the dev-only `DevDataLoader` re-encodes every account to this on each startup):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | alihasansheikh01@gmail.com | password |
| Admin | admin@builderconnect.pk | password |
| Support Agent | support@builderconnect.pk | password |
| Client | client1@example.com | password |
| Client | client2@example.com | password |
| Client | client3@example.com | password |
| Builder | builder1@example.com | password |
| Builder | builder2@example.com | password |
| Builder | builder3@example.com | password |
| Builder | builder4@example.com | password |
| Supplier | supplier1@example.com | password |
| Supplier | supplier2@example.com | password |

---

## Configuration

### Key Application Properties

Configurations in `backend/src/main/resources/application.yml`:

```yaml
# Server
server.port: 8080
server.servlet.context-path: /api

# Database — H2 in-memory in the dev profile (active by default); no external DB required
# Data resets on every restart

# JWT (base application.yml — dev profile supplies a dev-only secret)
jwt.secret: ${JWT_SECRET}                # required in prod; startup fails if missing or < 32 bytes
jwt.access-token-expiration: 1800000     # 30 minutes
jwt.refresh-token-expiration: 604800000  # 7 days

# Platform Settings
app.platform.fee-percentage: 5.0
app.rate-limit.auth-requests-per-minute: 10      # login/register/forgot/reset (per IP)
app.rate-limit.general-requests-per-minute: 100  # all other API paths (per IP)
```

Local development needs no environment variables — the **dev profile** (active by default) supplies the H2 database and a dev-only JWT secret. Production requires `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD`, and `SPRING_PROFILES_ACTIVE=prod` (see `backend/.env.example`).

---

## WebSocket Connection

### Connecting to Chat

```javascript
const socket = new SockJS('http://localhost:8080/api/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({
  Authorization: `Bearer ${accessToken}`
}, () => {
  // Subscribe to room messages
  stompClient.subscribe('/topic/chat/{roomId}', (message) => {
    const data = JSON.parse(message.body);
    console.log('New message:', data);
  });
});
```

---

## Contributing

This is a proprietary project and is **not accepting external contributions**. The source is published for viewing and evaluation only — see the [License](#license) section below.

---

## License

**Proprietary — All Rights Reserved.**

Copyright (c) 2026 Ali Hasan Sheikh.

This source code is made available for viewing and evaluation purposes only. Copying, modifying, redistributing, using it in any product or service, or claiming authorship of this work — in whole or in part — is prohibited without prior written permission of the copyright holder. See the [LICENSE](LICENSE) file for the full terms.

---

## Support

For questions or issues:
- Open an issue on GitHub
- Email: support@builderconnect.pk

---

**Built with ❤️ for the Pakistani construction industry**

Copyright (c) 2026 Ali Hasan Sheikh. All Rights Reserved.
