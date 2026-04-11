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
import authRoutes from './src/common/routes/authRoutes.js';

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL || 'https://ethical-tourism-certification-system.vercel.app'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes
app.use('/hotels-search', searchModuleRoutes);
app.use('/hotels', certificationAppRoutes);
app.use('/certification', certificationLifecycleRoutes);
app.use('/audits', auditModuleRoutes);
app.use('/auth', authRoutes);

// Health check for v1
app.get('/', (req, res) => {
  res.send('API v1 is running');
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;
