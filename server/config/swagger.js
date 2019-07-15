const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  definition: {
    openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
    info: {
      title: 'Deep Sea Annotations API',
      version: '1.0.0',
      description: 'Deep Sea Annotations API Documentation',
    },
  },
  securityDefinitions: {
    ApiKeyAuth: {
      name: "Authorization",
      type: "apiKey",
      scheme: "Authorization",
      in: "header"
    }
  },
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
}

const options = {
  swaggerDefinition,
  // List of files to be processed.
  apis: ['./server/routes/**/*.js'],

};

var swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = { swaggerSpecs, swaggerOptions };