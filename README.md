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
    ```

3.  **Run the Server**:
    ```bash
    npm start
    ```
    The server will start on `http://localhost:5000`.

## 📖 API Documentation

Swagger UI is available at **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**.

## 🧪 Testing

Run the end-to-end confirmation flow test:
```bash
npm test
```
