import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/common/config/swagger.js';
import { errorHandler } from './src/common/middleware/errorMiddleware.js';

// Module Routes
import searchModuleRoutes from './src/modules/search/routes/index.js';
import certificationAppRoutes from './src/modules/certification/application/routes/index.js';
import certificationLifecycleRoutes from './src/modules/certification/lifecycle/routes/index.js';
import auditModuleRoutes from './src/modules/audit/routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes
app.use('/hotels-search', searchModuleRoutes);
app.use('/hotels', certificationAppRoutes);
app.use('/certification', certificationLifecycleRoutes);
app.use('/audits', auditModuleRoutes);

// Health check for v1
app.get('/', (req, res) => {
    res.send('API v1 is running');
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;
