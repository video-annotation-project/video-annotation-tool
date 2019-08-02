const options = {
  swaggerDefinition: {
    definition: {
      openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
      info: {
        title: 'Deep Sea Annotations API',
        version: '1.0.0',
        description: 'Deep Sea Annotations API Documentation'
      }
    },
    securityDefinitions: {
      ApiKeyAuth: {
        name: 'Authorization',
        type: 'apiKey',
        scheme: 'Authorization',
        in: 'header'
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  basedir: __dirname,
  files: ['../routes/**/*.js']
};

module.exports = options;
