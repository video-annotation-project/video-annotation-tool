const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const AWS = require("aws-sdk");

router.use('/progress', require('./progress'))
router.use('/tensorboard', require('./tensorboard'))
router.use('/train', require('./train'))


 /**
 * @typedef model
 * @property {string} name - Name of the model
 * @property {string} timestamp - Date the model was created
 * @property {Array.<string>} concepts - List of concept names the model was trained using
 */

/**
 * @route GET /api/models
 * @group models 
 * @summary Get a list of all models
 * @returns {Array.<model>} 200 - List of models
 * @returns {Error} 500 - Unexpected database error
 */
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


// TODO: does userid work?
 /**
 * @typedef modelCreated
 * @property {string} name - Name of the model
 * @property {string} timestamp - Date the model was created
 * @property {Array.<integer>} concepts - List of concept IDs the model was trained using
 * @property {Array.<integer>} verificationvideos - List of videos used for verification of the model
 * @property {Array.<integer>} userid - ID of user who created the model
 */

/**
 * @route POST /api/models
 * @group models 
 * @summary Create a new model
 * @param {string} name.body.required - Name of the model to be created
 * @param {Array.<integer>} concepts.body.required - Concept IDs to train the model with
 * @param {Array.<integer>} videos.body.required - Video IDs to train the model with
 * @returns {Array.<modelCreated>} 200 - List containing the created model
 * @returns {Error} 500 - Unexpected database error
 */
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


// TODO: this should probably be under api/concepts/
 /**
 * @typedef modelConcept
 * @property {integer} id - ID of the concept
 * @property {string} name - Name of the concept
 * @property {string} rank - Rank of the concept
 */

/**
 * @route POST /api/models/concepts
 * @group models 
 * @summary Get a list of concept names that have annotations
 * @returns {Array.<modelConcept>} 200 - List of concepts with annotations
 * @returns {Error} 500 - Unexpected database error
 */
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

 /**
 * @typedef modelRun
 * @property {integer} id - ID of the training session
 * @property {string} model_name - Name of the model used in the session
 * @property {string} start_train - Start time of the training session
 * @property {string} end_train - End time of the training session
 * @property {integer} epoch - Number of epochs the training used
 * @property {integer} min_examples - Number of images the training used
 * @property {Array.<integer>} concepts - Concept names used to train with
 * @property {Array.<string>} users - User names with annotations used in training
 */
 
/**
 * @route GET /api/models/runs
 * @group models 
 * @summary Get a list of previous training sessions
 * @returns {Array.<modelRun>} 200 - List of concepts with annotations
 * @returns {Error} 500 - Unexpected database error
 */

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


/**
 * @route DELETE /api/models
 * @group models
 * @summary Delete a model
 * @param {string} name.body.required - model name
 * @returns {string} 200 - "deleted"
 * @returns {Error} 500 - Unexpected database or S3 error
 */
router.delete(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let s3 = new AWS.S3();
    let deleteModel = `
      DELETE FROM
        models
      WHERE
        name=$1
      RETURNING *`;
    let deleteModelUser = `
      DELETE FROM
        users  
      WHERE
        username LIKE $1
      RETURNING *
    `;
    let deleteModelVideos = `
      DELETE FROM
        ai_videos  
      WHERE
        name LIKE $1
      RETURNING *
    `;

    try {
      var arg = req.body.model.name + '-%';
      await psql.query(deleteModel, [req.body.model.name]);
      await psql.query(deleteModelUser, [arg]);

      arg = '%_' + arg;
      let modelVideosRes = await psql.query(deleteModelVideos, [arg]);

      //These are the s3 object we will be deleting
      let Objects = [];

      if (modelVideosRes.rows.length > 0) {
        modelVideosRes.rows.forEach(element => {
          Objects.push({
            Key: process.env.AWS_S3_BUCKET_AIVIDEOS_FOLDER + element.name
          });
        });

        let params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Delete: {
            Objects: Objects
          }
        };
        console.log(params);
        let s3Res = await s3.deleteObjects(params,
          (err, data) => {
            if (err) {
              console.log(err);
              res.status(500).json(err);
            } else {
              console.log(data);
            }
          });
      }

      res.json("deleted");
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;
