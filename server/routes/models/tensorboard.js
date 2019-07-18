const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const awsS3 = require("s3");
const { spawn } = require("child_process");

let currentTensorboardID = null;
let currentTensorboardProcess = null;

/**
 * @typedef tensorboard
 * @property {integer} id - ID of currently running tensorboard process
 */

/**
 * @route GET /api/models/tensorboard
 * @group models 
 * @summary Get the currently running tensorboard process
 * @returns {tensorboard.model} 200 - Current running tensorboard process ID
 * @returns {Error} 500 - Unexpected server error
 */
router.get("/", passport.authenticate("jwt", { session: false }), 
  async (req, res) => {
    res.json({ id: currentTensorboardID });
  }
);

/**
 * @route DELETE /api/models/tensorboard
 * @group models 
 * @summary End the currently running tensorboard process
 * @returns 200 - Successfully stopped tensorboard process
 * @returns {Error} 400 - Unable to end process
 */
router.delete("/", passport.authenticate("jwt", { session: false }), 
  async (req, res) => {
    if (currentTensorboardID !== null) {
      try {
        currentTensorboardProcess.kill();
        currentTensorboardProcess = null;
        currentTensorboardID = null;

        res.sendStatus(200);
      } catch (err) {
        if (err.code !== "ESRCH") {
          res.status(400).json(err);
        } else {
          res.sendStatus(200);
        }
      }
    } else {
      // Already killed, success!
      res.sendStatus(200);
    }
  }
);


/**
 * @route POST /api/models/tensorboard
 * @group models 
 * @summary Start a tensorboard isntance for a specific training session
 * @param {integer} id.url.required - ID of training session to load tensorboard logs from
 * @returns 200 - Successfully started tensorboard
 * @returns {Error} 400 - Unable to download tensorboard files or end previous running process
 */
router.post("/:id", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const id = req.params.id;

    // If other tensorboard servers are running, end them first
    if (currentTensorboardID !== null) {
      try {
        currentTensorboardProcess.kill();
      } catch (err) {
        if (err.code !== "ESRCH") {
          res.status(400).json(err);
        }
      }
    }

    var client = awsS3.createClient({
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    var downloader = client.downloadDir({
      localDir: `logs/${id}/`,
      deleteRemoved: true,
      s3Params: {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Prefix: process.env.AWS_S3_BUCKET_LOGS_FOLDER + `${id}`
      }
    });

    downloader.on("error", function(err) {
      res.status(400).json(err);
    });

    downloader.on("end", function(data) {
      const tensorboard = spawn(`tensorboard`, [
        `--logdir=logs/${id}`,
        "--port=6008"
      ]);

      tensorboard.stderr.on("data", data => {
        if (!res.headersSent) {
          currentTensorboardID = id;
          currentTensorboardProcess = tensorboard;
          res.sendStatus(200);
        }
      });

      tensorboard.on("exit", (code, signal) => {
        if (!res.headersSent) {
          res.sendStatus(200);
        }
      });

      tensorboard.on("error", err => {
        if (!res.headersSent) {
          res.status(400).json(err);
        }
      });
    });
  }
);

module.exports = router;
