const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'psMaster',
  host: 'deep-sea-annotations.cet7hhddo9tj.us-west-1.rds.amazonaws.com',
  database: 'dbname',
  password: 'mypassword123',
  post: 5432,
})

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  }
}
