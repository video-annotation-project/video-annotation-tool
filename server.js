const express = require('express');
const path = require('path');
const app = express();

app.set('port', (process.env.PORT || 3001));

app.get('/api', (req, res) => {
  res.json('Test API reponse sent from Node js server');
});

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  app.get('/*', (req, res) =>  {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});
