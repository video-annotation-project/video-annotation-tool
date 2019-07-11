const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");


router.get("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT
        *
      FROM
        profile
      LEFT JOIN
        (
          SELECT
            *
          FROM ONLY
            concepts
          NATURAL FULL JOIN
            concept_collection
        ) AS concepts
      ON
        concepts.id=profile.conceptId
      WHERE
        profile.userid=$1 AND deleted_flag IS NOT TRUE
      ORDER BY
        profile.conceptidx, concepts.name
    `;
    try {
      let concepts = await psql.query(queryText, [req.user.id]);
      res.json(concepts.rows);
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
        profile (userid, conceptid)
      VALUES
        ($1, $2)
      RETURNING *
    `;
    try {
      let insert = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({ value: JSON.stringify(insert.rows) });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.delete("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      DELETE FROM
        profile
      WHERE
        profile.userid=$1 AND profile.conceptid=$2
      RETURNING *
    `;
    try {
      let del = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({ value: JSON.stringify(del.rows) });
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

// updates conceptsSelected when they are reordered
router.patch("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const conceptsSelected = JSON.stringify(req.body.conceptsSelected);
    const queryText = `
      UPDATE 
        profile AS p
      SET
        conceptidx=c.conceptidx
      FROM 
        json_populate_recordset(null::profile,'${conceptsSelected}') AS c
      WHERE
        c.userid=p.userid AND c.conceptid=p.conceptid
    `;
    try {
      let update = await psql.query(queryText);
      res.json({ value: JSON.stringify(update.rows) });
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

module.exports = router;
