const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");


router.get("/train", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        * 
      FROM 
        training_progress 
      ORDER BY 
        id DESC LIMIT 1
    `;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/models");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get("/predict", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        * 
      FROM 
        predict_progress 
    `;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/models");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;