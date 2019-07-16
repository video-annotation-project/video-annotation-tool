const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const AWS = require("aws-sdk");

router.use('/progress', require('./progress'))
router.use('/tensorboard', require('./tensorboard'))
router.use('/train', require('./train'))

router.get("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        m.name, m.timestamp, array_agg(c.name) concepts, array_agg(c.id) conceptsid
      FROM 
        (SELECT name, timestamp, UNNEST(concepts) concept FROM models) m
      JOIN 
        concepts c ON c.id=m.concept
      GROUP BY
        (m.name, m.timestamp)
    `;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.post("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        models (name, timestamp, concepts, verificationvideos)
      VALUES
        ($1, current_timestamp, $2, $3)
      RETURNING *
    `;
    try {
      let response = await psql.query(queryText, [
        req.body.name,
        req.body.concepts,
        req.body.videos
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// returns a list of concept names that have annotations
router.get("/concepts", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        concepts.id, concepts.name, concepts.rank
      FROM (
        SELECT
          conceptid, count(*)
        FROM
          annotations
        GROUP BY
          annotations.conceptid
      ) AS a
      LEFT JOIN
        concepts
      ON 
        a.conceptid=concepts.id
      ORDER BY 
        concepts.name
    `;
    try {
      const concepts = await psql.query(queryText);
      res.json(concepts.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.get("/runs", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT
        m.id, m.model_name, m.start_train, m.end_train, m.epochs, m.min_examples,
        array_agg(DISTINCT c.name) concepts, array_agg(DISTINCT u.username) users
      FROM
        previous_runs m
      JOIN
        concepts c ON c.id=ANY(m.concepts)
      JOIN
        users u ON u.id=ANY(m.users)
      GROUP BY
        (m.id, m.model_name, m.start_train, m.end_train, m.epochs, m.min_examples)
      ORDER BY
        id DESC`;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;
