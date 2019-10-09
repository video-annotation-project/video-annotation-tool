const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

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
  '/status',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const status1 = `SELECT videoid FROM predict_progress`;
    const status2 = `SELECT status FROM training_progress`;
    const train = `SELECT model FROM model_params`;
    const predict = `SELECT model FROM predict_params`;
    try {
      let resJSON = [];
      let res1 = await psql.query(status1);
      let res2 = await psql.query(status2);

      if (res1.rows.length === 0 && res2.rows[0].status === 0) {
        resJSON = { predict: null, train: null };
      } else if (res1.rows.length === 0) {
        let trainStatus = await psql.query(train);
        resJSON = { predict: null, train: trainStatus.rows[0] };
      } else if (res2.rows[0].status === 0) {
        let predictStatus = await psql.query(predict);
        resJSON = { predict: predictStatus.rows[0], train: null };
      } else {
        let trainStatus = await psql.query(train);
        let predictStatus = await psql.query(predict);
        resJSON = { predict: predictStatus.rows[0], train: trainStatus.rows[0] };
      }
      res.json(resJSON);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;
