const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const AWS = require('aws-sdk');

router.get('/status',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let ec2 = new AWS.EC2({ region: 'us-west-1' });

    const params = {
      InstanceIds: [
        'i-011660b3e976035d8'
      ],
      IncludeAllInstances: true
    };

    try {
      ec2.describeInstanceStatus(params, function(error, data) {
        if (error){
          console.log('Error on GET /api/models/progress/train');
          console.log(error);
          res.status(500).json(error);
          return;
        }
        if (!data || data.InstanceStatuses.length === 0){
          res.status(500).json({error: 'No instanced found.'});
        } else {
          res.json(data.InstanceStatuses[0].InstanceState.Name);
        }
      });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

module.exports = router;

