# Site Network Management
hi
A full-stack web application built for managing and monitoring site/network-related information through a centralized dashboard.  
The project focuses on structured data handling, authentication, role-based access, and an interactive frontend interface.

---

## Live Demo

- Frontend: [Live Website](https://site-network-management-1.onrender.com)
- Backend/API: [API Endpoint](https://site-network-management.onrender.com)



---

## Demo Credentials

### Viewer Account

```txt
Email: viewer_user
Password: viewer1234
```

> Note: Demo access is limited to viewer-level permissions.  
> Administrative features are restricted.

---

# Features

- User authentication system
- Role-based access control
- GraphQL API integration
- Interactive dashboard UI
- Network/site data management
- Responsive frontend design
- Backend API handling with Express
- SQLite database integration

---

# Tech Stack

## Frontend
- React
- Vite
- Apollo Client
- React Router
- Tailwind CSS

## Backend
- Node.js
- Express.js
- GraphQL
- Apollo Server
- SQLite

---

# Project Structure

```txt
Site-Network-Management/
│
├── Study_Frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── Study_Backend/
│   ├── entrypoint.js
│   ├── schema/
│   ├── database/
│   └── package.json
│
└── README.md
```

---

# Backend Setup

```bash
cd Study_Backend
npm install
npm start
```

Backend runs on:

```txt
http://localhost:4000
```

---

# Frontend Setup

```bash
cd Study_Frontend
npm install
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

---

# Environment Variables

Frontend `.env`

```env
VITE_API_URL=http://localhost:4000/graphql
```

Backend `.env`

```env
JWT_SECRET=
```

---

# Deployment

The project is deployed using:

- Frontend → Render Static Site
- Backend → Render Web Service

---

# API

GraphQL endpoint:

```txt
/graphql
```

---

# Future Improvements

- Real-time monitoring support
- Better analytics dashboard
- Notification system
- Persistent cloud database integration
- Docker support
- CI/CD pipeline setup

---

# Author

GitHub: https://github.com/Bokka-kartik
