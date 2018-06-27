## Overview

A Webpack development server is configured to run on `localhost:3000`. This development server will bundle all static assets located under `client/src/`. All requests to `localhost:3000` will serve `client/index.html` which will include Webpack's `bundle.js`.

The user's browser visits the Webpack dev server at `localhost:3000`. React components communicate with the API server (`server.js`) when needed, at `localhost:3001`.

![Flow diagram](./flow-diagram.png)
