const express = require('express');
const fs = require('fs');
// const sqlite = require('sql.js');

// const filebuffer = fs.readFileSync('db/usda-nnd.sqlite3');

// const db = new sqlite.Database(filebuffer);

const app = express();

app.set('port', (process.env.PORT || 3001));

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
}

app.get('/api', (req, res) => {
  res.json('Test API reponse sent from Node js server');
});

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});
