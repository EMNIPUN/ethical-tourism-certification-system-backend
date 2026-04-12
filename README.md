# Ethical Tourism Certification System Backend

Backend service for the Ethical Tourism Certification platform, built with Node.js, Express, and MongoDB using a feature-based architecture.

## Quick Overview
- Project: Ethical Tourism Certification System (Backend)
- Purpose: Manage certification, search, lifecycle, audit, and related API workflows
- Stack: Node.js, Express, MongoDB (Mongoose), JWT auth, Swagger

## Key Features
- Feature-based modular architecture for parallel development
- JWT authentication and authorization middleware
- Search module with hotel discovery and feedback APIs
- Certification application and lifecycle workflow support
- Audit module with modular service/controller structure
- API documentation via Swagger UI
- Unit, integration, and performance testing support

## Project Structure
```text
ethical-tourism-certification-system-backend/
├── api/
│   └── index.js
├── src/
│   ├── common/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── swagger/
│   │   ├── utils/
│   │   └── validations/
│   └── modules/
│       ├── audit/
│       ├── certification/
│       │   ├── application/
│       │   └── lifecycle/
│       └── search/
├── app.js
├── server.js
├── vercel.json
└── package.json
```

## Documentation and Module Guidelines
- Common guidelines: [src/common/GUIDELINES.md](src/common/GUIDELINES.md)
- Search module guidelines: [src/modules/search/GUIDELINES.md](src/modules/search/GUIDELINES.md)
- Audit module docs: [src/modules/audit/README.md](src/modules/audit/README.md)
- Lifecycle testing docs: [src/modules/certification/lifecycle/TESTING_GUIDE.md](src/modules/certification/lifecycle/TESTING_GUIDE.md)

## Local Development

### Prerequisites
- Node.js 22+
- npm
- MongoDB instance (local or Atlas)

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the backend root:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

SERPAPI_KEY=your_serpapi_key
SENDGRID_API_KEY=your_sendgrid_key
```

Add any additional module-specific keys used in your environment.

### Run Server
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation
Swagger UI is available at:
- Local: http://localhost:5000/api/v1/api-docs

## Testing

### Module Testing Instruction Files
- Search testing instructions: [src/modules/search/SEARCH_TESTING_INSTRUCTIONS.md](src/modules/search/SEARCH_TESTING_INSTRUCTIONS.md)
- Lifecycle testing instructions: [src/modules/certification/lifecycle/CETI_LIFECY_TESTING_INSTRUCTIONS.md](src/modules/certification/lifecycle/CETI_LIFECY_TESTING_INSTRUCTIONS.md)


## Deployment

### Backend Deployment Platform and Setup
- Platform: Vercel (serverless entry: `api/index.js`)
- Config: `vercel.json`

Setup steps:
1. Push backend code to your Git repository.
2. Import repository into Vercel.
3. Configure environment variables in Vercel dashboard.
4. Deploy and verify API health and Swagger endpoints.

### Environment Variables (Production)
Define these in your deployment environment:
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `JWT_COOKIE_EXPIRE`
- `SERPAPI_KEY`
- `SENDGRID_API_KEY`

Add any additional secrets required by your active modules.

## Deployment Evidence (Screenshot Placeholders)

Use this section to add your submission screenshots.

### 1. Vercel Project Deployment Dashboard
Insert screenshot path below:

![Backend deployment dashboard screenshot](deployment/backend-vercel-dashboard.png)

> Replace `deployment/backend-vercel-dashboard.png` with your actual screenshot path.

### 2. Live API Health Endpoint
Insert screenshot path below:

![Backend API health screenshot](deployment/backend-api-health.png)

> Replace `deployment/backend-api-health.png` with your actual screenshot path.

### 3. Swagger API Docs in Production
Insert screenshot path below:

![Backend swagger screenshot](deployment/backend-swagger.png)

> Replace `deployment/backend-swagger.png` with your actual screenshot path.

### 4. Environment Variables Configuration (Optional)
Insert screenshot path below:

![Backend env configuration screenshot](deployment/backend-env-vars.png)

> Replace `deployment/backend-env-vars.png` with your actual screenshot path.

## Troubleshooting
- `MONGO_URI` connection failures: verify URI and network whitelist.
- Auth errors (`401/403`): verify JWT secret and token expiry settings.
- Missing module env vars: check module-specific `.env` keys.
- Vercel runtime issues: confirm `api/index.js` export and `vercel.json` routes.

## Useful Commands
```bash
npm run dev
npm start
npm run test:unit
npm run test:integration
npm run test:search
npm run perf:search
npm run test:lifecycle
npm run perf:lifecycle
```
