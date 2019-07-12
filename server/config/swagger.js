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
}

const options = {
  swaggerDefinition,
  // List of files to be processed.
  apis: ['./server/routes/users/index.js'],
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = swaggerSpecs;