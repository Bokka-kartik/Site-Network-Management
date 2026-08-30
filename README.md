# Site Network Management

A full-stack study and site management dashboard for tracking studies, sites, examiners, and assignment relationships through a GraphQL-backed application.

[Live Demo](https://site-network-management-1.onrender.com) • [API](https://site-network-management.onrender.com) • [GitHub](https://github.com/Bokka-kartik/Site-Network-Management)

## Overview

This project is a learning-focused full-stack app built to manage the operational relationships between studies, sites, and examiners. It centralizes records for:

- study definitions and status tracking
- site records and lifecycle status
- examiner profiles and certifications
- site-to-study and examiner-to-site assignments
- audit activity and permission-aware access

The application demonstrates a practical full-stack architecture using React + Vite on the frontend and Apollo Server + SQLite on the backend. The backend exposes a GraphQL API for CRUD-style operations, nested relationship queries, and permission checks.

## Core Features

- Study management with search, pagination, and lifecycle states
- Site management with active/planned/closed tracking
- Examiner management with role-based profiles and certificate data
- Study-to-site and examiner-to-site assignment workflows
- Certificate validation for study eligibility
- Dashboard summary counts for studies, sites, and examiners
- Audit log tracking for key actions
- Role-based access control for Admin vs Viewer users
- Search and detail views for each entity

## Architecture

The application follows a simple three-layer architecture:

- Frontend: React + Vite + Apollo Client + React Router
- API Layer: Apollo Server with GraphQL schema and resolvers
- Data Layer: SQLite database with seeded roles, permissions, users, and relation tables

The frontend queries the GraphQL API, sends JWTs in the Authorization header, and loads nested study/site/examiner records. The backend resolves permissions server-side before allowing mutations or restricted reads.

## Tech Stack

### Frontend
- React
- Vite
- Apollo Client
- React Router
- Tailwind CSS

### Backend
- Node.js
- Express
- Apollo Server
- GraphQL
- SQLite3
- JWT authentication
- bcryptjs password hashing

## Project Structure

```txt
Site-Network-Management/
├── README.md
├── Study_Frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── Study_Backend/
│   ├── Database_Operations/
│   ├── auth.js
│   ├── entrypoint.js
│   ├── resolver.js
│   ├── Schemas.js
│   ├── package.json
│   └── .env.example (if added locally)
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Backend Setup

```bash
cd Study_Backend
npm install
```

Create a `.env` file in the backend folder:

```env
JWT_SECRET=your_secure_secret
PORT=4000
```

Then start the server:

```bash
npm start
```

The API will run at:

```txt
http://localhost:4000/
```

### Frontend Setup

```bash
cd Study_Frontend
npm install
npm run dev
```

The app is usually served on:

```txt
http://localhost:5173/
```

### Environment Variables

The backend expects a `JWT_SECRET` for token signing.

The frontend currently points to the deployed Render GraphQL URL directly in [Study_Frontend/src/Connection/client.js](Study_Frontend/src/Connection/client.js). For local development, update that URI to:

```js
uri: "http://localhost:4000/"
```

or refactor it to read from a `VITE_API_URL` environment variable.

## Authentication & Authorization

Authentication is implemented with a GraphQL `login` mutation. The user submits either a username or email and password; the backend checks the hashed password, signs a JWT, and returns the authenticated user payload plus token.

Role-based access is enforced in the backend through a permissions table tied to roles:

- Admin: full access to create, update, and manage studies, sites, examiners, and assignments
- Viewer: read-only access, with limited permissions such as `study_read`

The JWT is attached in the `Authorization: Bearer <token>` header, and each protected mutation checks the user role and required permission before execution.

## Demo Credentials

Seed data is inserted when the backend starts. The repository includes these demo accounts:

```txt
Username: kartik
Password: kartik1234
Role: Admin
```

```txt
Username: viewer_user
Password: viewer1234
Role: Viewer
```

> The viewer account is intentionally restricted to read-only behavior. Admin-level actions are not available to that role.

## GraphQL API

This project uses a GraphQL-only API layer rather than a REST API. Key operations include:

- `login`
- `counts`
- `studies`
- `sites`
- `examiners`
- `studyDetail`
- `siteDetail`
- `examinerDetail`
- `createStudy`
- `createSite`
- `createExaminer`
- `assignStudyToSite`
- `assignExaminerToSite`
- `upsertCertificate`
- `updateStudy`
- `updateExaminer`
- `updateSite`
- `auditLogs`

Example login mutation:

```graphql
mutation Login($usernameOrEmail: String!, $password: String!) {
  login(usernameOrEmail: $usernameOrEmail, password: $password) {
    success
    message
    token
    user {
      user_id
      username
      email
      role
      permissions
    }
  }
}
```

Example study query:

```graphql
query Studies {
  studies(page: 1, perPage: 10) {
    items {
      protocol_id
      study_name
      status
    }
  }
}
```

## Deployment

The project is deployed on Render:

- Frontend: [site-network-management-1.onrender.com](https://site-network-management-1.onrender.com)
- Backend/API: [site-network-management.onrender.com](https://site-network-management.onrender.com)

There is currently no Docker configuration included in the repository.

## Screenshots

Screenshots or GIFs are not currently included in the repository, but this would be a good place to add a few UI captures showing:

- dashboard overview
- study management table
- site detail view
- examiner assignment screen

## Future Improvements

- Add a cleaner local `.env` configuration for frontend and backend
- Add automated tests for GraphQL resolvers and auth rules
- Improve dashboard analytics and filters
- Add stronger validation and error handling for edge cases
- Move from SQLite to a production-ready database for larger data sets
- Expand role management beyond the current Admin/Viewer model

## Key Learning / Technical Highlights

This repository is a strong example of a learning project that demonstrates a broad set of full-stack concepts:

- GraphQL schema design with nested relationship resolution
- JWT-based authentication and permission-aware backend checks
- SQLite data modeling for users, roles, permissions, sites, studies, and assignments
- React dashboard patterns with Apollo Client and nested query results
- Administrative workflows for assignment and certificate validation
- Audit logging for operational traceability

## Author

GitHub: [Bokka-kartik](https://github.com/Bokka-kartik)
