const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: '13.56.178.123',
  database: 'postgres',
  password: '123',
  post: 5432,
})

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  }
}
