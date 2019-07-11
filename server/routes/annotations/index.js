const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const AWS = require("aws-sdk");

router.get("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [];
    //Build query string
    let queryPass = `
      SELECT
        annotations.id, annotations.comment, 
        annotations.verifiedby, annotations.priority,
        annotations.unsure, annotations.timeinvideo, 
        annotations.imagewithbox, concepts.name, 
        false as extended 
      FROM
        annotations
      LEFT JOIN
        concepts ON concepts.id=annotations.conceptid
      WHERE 
        annotations.userid NOT IN (17, 32)`;
    if (req.query.unsureOnly === "true") {
      queryPass +=` AND annotations.unsure = true`;
    }
    if (req.query.verifiedCondition === "verified only") {
      queryPass += ` AND annotations.verifiedby IS NOT NULL`;
    } else if (req.query.verifiedCondition === "unverified only") {
      queryPass += ` AND annotations.verifiedby IS NULL`;
    }
    if (req.query.admin !== "true") {
      queryPass += ` AND annotations.userid = $1`;
      params.push(req.user.id);
    }
    // Adds query conditions from Report tree
    queryPass +=
      req.query.queryConditions + ` ORDER BY annotations.timeinvideo`;
    // Retrieves only selected 100 if queryLimit exists
    if (req.query.queryLimit !== "undefined") {
      queryPass = queryPass + req.query.queryLimit;
    }
    try {
      const annotations = await psql.query(queryPass, params);
      res.json(annotations.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.post("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    data = [
      req.user.id,
      req.body.videoId,
      req.body.conceptId,
      req.body.timeinvideo,
      req.body.x1,
      req.body.y1,
      req.body.x2,
      req.body.y2,
      req.body.videoWidth,
      req.body.videoHeight,
      req.body.image + ".png",
      req.body.imagewithbox + ".png",
      req.body.comment,
      req.body.unsure
    ];
    const queryText = `
      INSERT INTO 
        annotations (
          userid, videoid, conceptid, timeinvideo, x1, y1, x2, y2, videoWidth,
          videoHeight, image, imagewithbox, comment, unsure, dateannotated
        )
      VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          current_timestamp
        )
      RETURNING *
     `;
    try {
      let insertRes = await psql.query(queryText, data);
      res.json({
        message: "Annotated",
        value: JSON.stringify(insertRes.rows[0])
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({error});
    }
  }
);


router.patch("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {

    if (req.body.op === "updateBoundingBox"){
      updateBoundingBox(req, res)
    } else if (req.body.op === "verifyAnnotation"){
      verifyAnnotation(req, res)
    } else {
      res.status(400).json({error: "Unrecognized patch operation."});
    }
  }
);


router.delete("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let s3 = new AWS.S3();
    let queryText = `
      DELETE FROM
        annotations
      WHERE 
        annotations.id=$1 OR annotations.originalid=$1 
      RETURNING *
    `;
    try {
      let deleteRes = await psql.query(queryText, [req.body.id]);

      //These are the s3 object we will be deleting
      let Objects = [];

      deleteRes.rows.forEach(element => {
        Objects.push({
          Key: process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + element.image
        });
        Objects.push({
          Key:
            process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + element.imagewithbox
        });
      });
      // add tracking video
      Objects.push({
        Key:
          process.env.AWS_S3_BUCKET_VIDEOS_FOLDER +
          req.body.id +
          "_tracking.mp4"
      });
      let params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: {
          Objects: Objects
        }
      };
      let s3Res = await s3.deleteObjects(params, (err, data) => {
        if (err) {
          console.log("Err: deleting images");
          res.status(500).json(err);
        } else {
          res.json("delete");
        }
      });
    } catch (error) {
      console.log("Error in delete /api/annotations");
      console.log(error);
      res.status(400).json(error);
    }
  }
);


router.post("/images", passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let s3 = new AWS.S3();
    let key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.body.date;
    if (req.body.box) {
      key += "_box";
    }
    const params = {
      Key: key + ".png",
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      ContentEncoding: "base64",
      ContentType: "image/png",
      Body: Buffer(req.body.buf) //the base64 string is now the body
    };
    s3.putObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.status(400).json(error).end();
      } else {
        res.json({ message: "successfully uploaded image to S3" });
      }
    });
  }
);


router.get("/unverified", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const selectedUsers = req.query.selectedUsers;
    const selectedVideos = req.query.selectedVideos;
    const selectedConcepts = req.query.selectedConcepts;
    const selectedUnsure = req.query.selectedUnsure;

    let params = [];
    let queryText = '';

    if (selectedUsers && selectedVideos && selectedConcepts && selectedUnsure){
      queryText += `SELECT DISTINCT a.*, c.name, u.username, v.filename `
    } else if (selectedUsers && selectedVideos && selectedConcepts){
      queryText += `SELECT DISTINCT a.unsure `
    } else if (selectedUsers && selectedVideos){
      queryText += `SELECT DISTINCT c.* `
    } else if (selectedUsers) {
      queryText += `SELECT DISTINCT v.id, v.filename `
    } else {
      res.status(400).json({error: 'Nothing selected.'})
    }

    queryText += `
      FROM 
        annotations a
      LEFT JOIN
        concepts c ON c.id=conceptid
      LEFT JOIN
        users u ON u.id=userid
      LEFT JOIN
        videos v ON v.id=videoid
      WHERE
        a.verifiedby IS NULL
    `;

    if (selectedUsers && !(selectedUsers.length === 1 && selectedUsers[0] === "-1")) {
      queryText += ` AND a.userid::text=ANY($${params.length + 1})`;
      params.push(selectedUsers);
    }

    if (selectedVideos && !(selectedVideos.length === 1 && selectedVideos[0] === "-1")) {
      queryText += ` AND a.videoid::text=ANY($${params.length + 1})`;
      params.push(selectedVideos);
    }

    if (selectedConcepts && !(selectedConcepts.length === 1 && selectedConcepts[0] === "-1")) {
      queryText += ` AND a.conceptid::text=ANY($${params.length + 1})`;
      params.push(selectedConcepts);
    }

    if (selectedUnsure === "true") queryText += ` AND unsure`;

    try {
      let concepts = await psql.query(queryText, params);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);


router.get("/treeData", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [];
    let queryPass = selectLevelQuery(req.query.levelName);
    if (req.query.queryConditions) {
      queryPass = queryPass + req.query.queryConditions;
    }
    if (req.query.unsureOnly === "true") {
      queryPass = queryPass + ` AND annotations.unsure = true`;
    }
    if (req.query.verifiedCondition === "verified only") {
      queryPass = queryPass + ` AND annotations.verifiedby IS NOT NULL`;
    } else if (req.query.verifiedCondition === "unverified only") {
      queryPass = queryPass + ` AND annotations.verifiedby IS NULL`;
    }
    if (req.query.admin !== "true") {
      queryPass = queryPass + ` AND annotations.userid = $1`;
      params.push(req.user.id);
    }
    queryPass = queryPass + ` GROUP BY (name, key) ORDER BY count DESC`;
    try {
      const data = await psql.query(queryPass, params);
      res.json(data.rows);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);



let updateBoundingBox = async (req, res) => {
    delete req.body.op;

    const params = Object.values(req.body);
    const queryText = `
      UPDATE
        annotations 
      SET 
        x1=$1, y1=$2, x2=$3, y2=$4, oldx1=$5, oldy1=$6, oldx2=$7, oldy2=$8,
        priority = priority+1 
      WHERE 
        id=$9
    `;
    try {
      let update = await psql.query(queryText, params);
      res.json(update.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
}

let verifyAnnotation = async (req, res) => {
  delete req.body.op;

  const verifiedby = req.user.id;
  const id = req.body.id;
  let s3 = new AWS.S3();

  let params = [id, verifiedby];
  let queryText1 = `
    UPDATE 
      annotations
    SET 
      verifiedby=$2, verifieddate=current_timestamp, originalid=null`;

  if (req.body.conceptId !== null) {
    queryText1 += `, conceptid=$3, oldconceptid=$4, priority=priority+3`;
    params.push(req.body.conceptId);
    params.push(req.body.oldConceptId);
  } else {
    queryText1 += `, priority = priority+1`;
  }

  params.push(req.body.comment);
  queryText1 += `, comment=$` + params.length;
  params.push(req.body.unsure);
  queryText1 += `, unsure=$` + params.length;
  queryText1 += ` WHERE id=$1`;

  const queryText2 = `
    DELETE FROM
      annotations
    WHERE 
      originalid=$1 AND annotations.id<>$1
    RETURNING *
  `;
  try {
    let deleteRes = await psql.query(queryText2, [id]);
    await psql.query(queryText1, params);

    //These are the s3 object we will be deleting
    let Objects = [];

    deleteRes.rows.forEach(element => {
      Objects.push({
        Key: process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + element.image
      });
      Objects.push({
        Key:
          process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + element.imagewithbox
      });
    });
    // add tracking video
    Objects.push({
      Key:
        process.env.AWS_S3_BUCKET_VIDEOS_FOLDER +
        req.body.id +
        "_tracking.mp4"
    });
    params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: {
        Objects: Objects
      }
    };
    await s3.deleteObjects(params, (err, data) => {
        if (err) {
            console.log(err);
            res.status(400).json(err);
        } else {
            console.log(data);
        }
      }
    );
    res.json("success");
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}


let selectLevelQuery = level => {
  let queryPass = "";
  if (level === "Video") {
    queryPass = `
      SELECT 
        videos.filename as name, videos.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, videos
      WHERE 
        videos.id=annotations.videoid AND annotations.userid NOT IN (17, 32)
    `;
  }
  if (level === "Concept") {
    queryPass = `
      SELECT 
        concepts.name as name, concepts.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, concepts
      WHERE 
        annotations.conceptid=concepts.id AND annotations.userid NOT IN (17, 32)
    `;
  }
  if (level === "User") {
    queryPass = `
      SELECT 
        users.username as name, users.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, users
      WHERE
        annotations.userid=users.id AND annotations.userid NOT IN (17, 32)
    `;
  }
  return queryPass;
};

module.exports = router;


// in the future, this route as well as the /api/conceptImages route can
// be circumvented by using cloudfront
// router.get(
//   "/api/annotationImages/:name",
//   passport.authenticate("jwt", { session: false }),
//   (req, res) => {
//     let s3 = new AWS.S3();
//     let key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.params.name;
//     var params = {
//       Key: key,
//       Bucket: process.env.AWS_S3_BUCKET_NAME
//     };
//     s3.getObject(params, (err, data) => {
//       if (err) {
//         res.status(500).json(err);
//         return;
//       }
//       res.json({ image: data.Body });
//     });
//   }
// );

// router.get("/api/annotationImages/:id", async (req, res) => {
//   let s3 = new AWS.S3();
//   queryText = "select image, imagewithbox from annotations where id=$1";
//   try {
//     const response = await psql.query(queryText, [req.params.id]);
//     var picture = null;
//     if (req.query.withBox === "true") {
//       picture = response.rows[0].imagewithbox;
//     } else {
//       picture = response.rows[0].image;
//     }
//     const params = {
//       Bucket: process.env.AWS_S3_BUCKET_NAME,
//       Key: process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + `${picture}`
//     };
//     s3.getObject(params)
//       .createReadStream()
//       .pipe(res);
//   } catch (error) {
//     res.status(400).json(error);
//   }
// });

// router.get("/api/annotationImageWithoutBox/:id", async (req, res) => {
//   let s3 = new AWS.S3();
//   queryText = "select image from annotations where id=$1";
//   try {
//     const response = await psql.query(queryText, [req.params.id]);
//     const picture = response.rows[0].image;
//     const params = {
//       Bucket: process.env.AWS_S3_BUCKET_NAME,
//       Key: process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + `${picture}`
//     };
//     s3.getObject(params)
//       .createReadStream()
//       .pipe(res);
//   } catch (error) {
//     res.status(400).json(error);
//   }
// });

