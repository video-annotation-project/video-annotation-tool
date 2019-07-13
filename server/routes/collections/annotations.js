const router = require("express").Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT
        ac.*,
        array_agg(ai.annotationid) as annotations
      FROM
        annotation_collection ac
      LEFT JOIN
        annotation_intermediate ai
      ON
        ac.id = ai.id
      LEFT JOIN
        annotations a ON ai.annotationid=a.id
      GROUP BY
        ac.id
      ORDER BY
        ac.name
    `;

    try {
      let annotationCollections = await psql.query(queryText);
      res.json(annotationCollections.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        annotation_collection (name, description)
      VALUES
        ($1, $2)
      RETURNING *
    `;
    try {
      let insert = await psql.query(queryText, [
        req.body.name,
        req.body.description
      ]);
      res.json({ value: JSON.stringify(insert.rows) });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      DELETE FROM 
        annotation_collection
      WHERE
        id = $1
      RETURNING *
    `;
    try {
      let deleted = await psql.query(queryText, [req.params.id]);
      if (deleted) {
        res.json(deleted);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.post(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [parseInt(req.params.id)];
    let queryText = `      
    INSERT INTO
        annotation_intermediate (id, annotationid)
      SELECT
        id::INTEGER, annotationid::INTEGER
      FROM
        (VALUES
    `;

    for (let i = 0; i < req.body.annotations.length; i++) {
      queryText += `($1, $${i + 2})`;
      if (i !== req.body.annotations.length - 1) {
        queryText += `, `;
      }
      params.push(req.body.annotations[i]);
    }

    queryText += `
        ) as t(id, annotationid)
      WHERE
        NOT EXISTS (
          SELECT
            1
          FROM
            annotation_intermediate ai
          WHERE
            ai.id = t.id::INTEGER AND ai.annotationid = t.annotationid::INTEGER)
    `;

    try {
      let added = await psql.query(queryText, params);
      if (added) {
        res.status(200).json(added);
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

module.exports = router;
