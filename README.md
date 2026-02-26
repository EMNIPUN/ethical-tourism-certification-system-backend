# Hotel Certification System

A specialized backend system for Hotel Certification, utilizing a **Feature-Based Architecture** to support parallel development.

## 📚 Documentation & Guidelines

Please read the specific documentation for the area you are working on:

- **[Common Utilities & Guidelines](src/common/GUIDELINES.md)**: **START HERE**. detailed development rules and utility usage.
- **[Application Module](src/modules/certification/application/GUIDELINES.md)**: (Sadeesha) Core application flow.
- **[Search Module](src/modules/search/GUIDELINES.md)**: (Nipun) External search integration.
- **[Audit Module](src/modules/audit/GUIDELINES.md)**: (Eric) Audit processes.
- **[Lifecycle Module](src/modules/certification/lifecycle/GUIDELINES.md)**: (Sadeesha/Chathush) Expiry and renewal.

## 🚀 Features

- **Certification Management**: detailed hotel application, scoring, and verification process.
- **Search Integration**: Google Hotels integration via SerpApi to fetch ratings.
- **Modular Architecture**: domain-driven design (`certification`, `search`) to minimize merge conflicts.
- **Swagger Documentation**: interactive API docs at `/api-docs`.

## 📂 Project Structure

The codebase is organized by **Feature Modules**.

```
src/
├── common/                  # Shared resources
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── swagger/
│   ├── utils/
│   ├── validations/
│   ├── routes/              # [NEW] Auth routes
│   └── controllers/         # [NEW] Auth controllers
│
├── modules/

│   ├── audit/               # [Owner: Eric]
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validations/
│   │
│   ├── certification/       # [Owner: Sadeesha/Chathush]
│   │   ├── application/     # Core Application Logic
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── validations/
│   │   │
│   │   └── lifecycle/       # [Placeholder] Status/Renewals
│   │       ├── controllers/
│   │       ├── middleware/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── utils/
│   │       └── validations/
│   │
│   └── search/              # [Owner: Nipun]
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       └── validations/
```

## 🛠️ Setup & Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    SERPAPI_KEY=your_serpapi_key
    NODE_ENV=development
    JWT_SECRET=your_super_secret_jwt_key
    JWT_EXPIRE=30d
    JWT_COOKIE_EXPIRE=30
    ```

3.  **Run the Server**:
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:5000`.

## 📖 API Documentation

Swagger UI is available at **[http://localhost:5000/api/v1/api-docs](http://localhost:5000/api/v1/api-docs)**.

## ▲ Deploy to Vercel

This project is configured for Vercel serverless deployment using:

- `api/index.js` as the serverless entry.
- `vercel.json` to route requests.

### 1) Push your code

Push this repository to GitHub (or GitLab/Bitbucket).

### 2) Import project in Vercel

1. Open Vercel dashboard.
2. Click **New Project**.
3. Import this repository.
4. Keep the default build settings for a Node.js project.

### 3) Configure environment variables

Add these variables in Vercel Project Settings → **Environment Variables**:

- `MONGO_URI`
- `SERPAPI_KEY`
- `NODE_ENV` (set to `production`)
- `JWT_SECRET`
- `JWT_EXPIRE`
- `JWT_COOKIE_EXPIRE`
- `SENDGRID_API_KEY` (if email features are used)

### 4) Deploy

Click **Deploy**. After deployment, your endpoints will be available as:

- Health check: `https://<your-vercel-domain>/api/v1/`
- Swagger: `https://<your-vercel-domain>/api/v1/api-docs`

## 🧪 Testing

Run the end-to-end confirmation flow test:
```bash
npm test
```
