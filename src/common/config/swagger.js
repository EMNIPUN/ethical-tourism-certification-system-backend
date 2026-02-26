import swaggerJsdoc from "swagger-jsdoc";

const options = {
   definition: {
      openapi: "3.0.0",
      info: {
         title: "CertiGuard™",
         version: "1.0.0",
         description:
            "API documentation for Ethical Tourism Certification System",
      },
      servers: [
         {
            url: "http://localhost:5000/api/v1",
            description: "Development server",
         },
      ],
      components: {
         securitySchemes: {
            bearerAuth: {
               type: "http",
               scheme: "bearer",
               bearerFormat: "JWT",
            },
         },
      },
      security: [
         {
            bearerAuth: [],
         },
      ],
      tags: [
         {
            name: "Authentication",
            description:
               "API endpoints for user authentication, including registration, login, and retrieving current user information.",
         },
         {
            name: "Certification Application Management",
            description:
               "API endpoints for managing hotel certificates and application workflows.",
         },
         {
            name: "Public Certification Verification & Discovery",
            description:
               "Public search and contact endpoints for certification verification and discovery. Includes hotel contact details and tourist feedback/review sections.",
         },
         {
            name: "Audit & Review",
            description:
               "API endpoints for auditing and reviewing hotel certification requests. Includes section-wise reviews, scoring, compliance checks, and site visit management.",
         },
      ],
   },
   apis: [
      "./src/modules/**/*.js",
      "./src/common/routes/**/*.js",
      "./src/common/swagger/*.js",
   ], // Files containing annotations
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
