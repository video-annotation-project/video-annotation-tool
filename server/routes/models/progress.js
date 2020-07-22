const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const AWS = require('aws-sdk');

/**
 * @typedef trainProgress
 * @property {boolean} running - Is the model currently training
 * @property {integer} curr_epoch - Current epoch the training is at
 * @property {integer} curr_batch - Current batch the training is at
 * @property {integer} max_epoch - Maximum epoch to end training
 * @property {integer} steps_per_epoch - Number of batches per epoch
 */

/**
 * @route GET /api/models/progress/train
 * @group models
 * @summary Get current training session progress
 * @returns {trainProgress.model} 200 - Current training progress
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/train',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        * 
      FROM 
        training_progress 
    `;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows[0]);
    } catch (error) {
      console.log('Error on GET /api/models/progress/train');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef predictProgress
 * @property {integer} videoid - ID of the video we're predicting
 * @property {integer} framenum - Current frame we are predicting on
 * @property {integer} status - Current prediction step (0 = resizing, 1 = predicting, 2 = generating)
 * @property {integer} totalframe - Total number of frames in video
 */

/**
 * @route GET /api/models/progress/predict
 * @group models
 * @summary Get current video prediction progress
 * @returns {predictProgress.model} 200 - Current prediction progress
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/predict',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        *
      FROM 
        predict_progress 
      LIMIT 1
    `;
    try {
      let response = await psql.query(queryText);
      let returnValue = response.rows[0];
      if (returnValue) {
        res.json(returnValue);
      } else {
        res.json('not loaded');
      }
    } catch (error) {
      console.log('Error on GET /api/models/progress/predict');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get(
  '/status/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let ec2 = new AWS.EC2({ region: 'us-west-1' });
    var params = {
      InstanceIds: [
        req.params.id
      ],
      IncludeAllInstances: true
    };
    ec2.describeInstanceStatus(params, async (err, data) => {
      let result = {
        status: null,
        param: null
      };
      if (err) {
        console.log(err, err.stack);
        res.status(400);
      } // an error occurred
      else {
        status = data.InstanceStatuses[0].InstanceState.Name;
        result.status = status;
        if (status !== "stopped") {
          let queryText = `
            SELECT * FROM ${
            req.query.train === "true" ?
              "model_params" : "predict_params"
            }
          `
          let model = await psql.query(queryText);
          result.param = model.rows[0].model;
        }
        res.send(result);
      }
    });
  }
);

module.exports = router;
