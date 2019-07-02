const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const bodyParser = require("body-parser");
const path = require("path");

const _ = require("lodash");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;
const bcrypt = require("bcrypt");

const psql = require("./db/simpleConnect");
const AWS = require("aws-sdk");

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = process.env.JWT_KEY;

async function findUser(userId) {
  queryPass = `
    SELECT 
      id,
      username,
      password,
      admin
    FROM
      users
    WHERE
      users.id=$1
  `;
  const user = await psql.query(queryPass, [userId]);
  if (user.rows.length == 1) {
    return user.rows[0];
  } else {
    return false;
  }
}

let strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {
  // console.log('payload received', jwt_payload);
  let user = await findUser(jwt_payload.id);
  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
});

passport.use(strategy);

app.use(passport.initialize());

// parse application/x-www-form-urlencoded
// for easier testing with Postman or plain HTML forms
// parse application/json - needs higher limit for passing img for annotation

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// This function sets the cookies that are used by the client to access the
// videos on AWS CloudFront
const setCookies = res => {
  const keyPairId = process.env.KEY_PAIR_ID;
  const privateKey = process.env.RSA_PRIVATE_KEY.split("\\n").join("\n");
  let cdnUrl = "cdn.deepseaannotations.com";
  let expiry = Math.floor(Date.now() / 1000) + 99960000;

  let policy = {
    Statement: [
      {
        Resource: "https://" + cdnUrl + "/*",
        Condition: {
          DateLessThan: { "AWS:EpochTime": expiry }
        }
      }
    ]
  };
  let policyString = JSON.stringify(policy);

  let signer = new AWS.CloudFront.Signer(keyPairId, privateKey);
  let options = { url: "https://" + cdnUrl, policy: policyString };
  signer.getSignedCookie(options, (error, cookies) => {
    if (error) {
      console.log("Error recieved from getSignedCookie function.");
      console.log("Throwing error.");
      throw error;
    }
    for (cookieName in cookies) {
      res.cookie(cookieName, cookies[cookieName], {
        domain: ".deepseaannotations.com",
        expires: new Date(expiry * 1000),
        httpOnly: true,
        path: "/",
        secure: true
      });
    }
  });
};

app.post("/api/login", async function(req, res) {
  const { username, password } = req.body;
  let queryPass = `
    SELECT 
      id,
      password, 
      admin
    FROM 
      users 
    WHERE
      users.username=$1
  `;
  try {
    const user = await psql.query(queryPass, [username]);
    if (user.rowCount === 0) {
      res.status(400).json({ detail: "No username found" });
      return;
    }
    if (!(await bcrypt.compare(password, user.rows[0].password))) {
      res.status(400).json({ detail: "wrong password" });
      return;
    }
    const payload = { id: user.rows[0].id };
    const token = jwt.sign(payload, jwtOptions.secretOrKey);
    setCookies(res);
    res.json({
      token: token,
      isAdmin: user.rows[0].admin
    });
  } catch (error) {
    console.log("Error in post /api/login");

    console.log(error);

    res.status(500).json(error);
  }
});

app.post(
  "/api/changePassword",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { password, newPassword1, newPassword2 } = req.body;
    const username = req.user.username;
    const queryPass = `
      SELECT
        password 
      FROM
        users
      WHERE 
        users.username=$1
    `;
    try {
      const currentPass = await psql.query(queryPass, [username]);
      if (!(await bcrypt.compare(password, currentPass.rows[0].password))) {
        res.status(400).json({ detail: "Wrong Password!" });
        return;
      }
      const saltRounds = 10;
      const hash = await bcrypt.hash(newPassword1, saltRounds);
      queryUpdate = "UPDATE users SET password=$1 WHERE username=$2";
      const update = await psql.query(queryUpdate, [hash, username]);
      res.json({ message: "Changed" });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

app.post(
  "/api/createUser",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO users(
        username, 
        password, 
        admin
      )
      VALUES(
        $1,
        $2, 
        $3
      ) 
      RETURNING *
    `;
    const saltRounds = 10;
    try {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const data = [req.body.username, hash, req.body.admin];
      const insertUser = await psql.query(queryText, data);
      res.json({ message: "user created", user: insertUser.rows[0] });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

app.get(
  "/api/users",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText =
      "SELECT DISTINCT u.id, u.username \
                       FROM users u\
                       JOIN annotations a ON a.userid=u.id";

    if (req.query.noAi === "true") {
      queryText += " WHERE u.username NOT IN ('tracking', 'ai')";
    }

    queryText += " ORDER BY u.username";

    try {
      const users = await psql.query(queryText);
      res.json(users.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/concepts/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    queryText = `
      SELECT
        id, 
        name 
      FROM 
        concepts 
      WHERE
        concepts.parent=$1
    `;
    try {
      const concepts = await psql.query(queryText, [req.params.id]);
      res.json(concepts.rows);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

// returns a list of concept names
app.get(
  "/api/concepts",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        concepts.id,
        concepts.name
      FROM (
        SELECT
          conceptid, 
          count(*)
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
        a.count DESC
    `;
    try {
      const concepts = await psql.query(queryText);
      res.json(concepts.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

// in the future, this route as well as the /api/annotationImages route can
// be circumvented by using cloudfront
app.get("/api/conceptImages/:id", async (req, res) => {
  let s3 = new AWS.S3();
  queryText = `
      SELECT
        picture 
      FROM
        concepts 
      WHERE
        concepts.id=$1
    `;
  try {
    const response = await psql.query(queryText, [req.params.id]);
    const picture = response.rows[0].picture;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: process.env.AWS_S3_BUCKET_CONCEPTS_FOLDER + `${picture}`
    };
    s3.getObject(params)
      .createReadStream()
      .pipe(res);
  } catch (error) {
    res.status(400).json(error);
  }
});

app.get(
  "/api/conceptsSelected",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    queryText = `
      SELECT 
        *
      FROM
        profile, 
        concepts
      WHERE 
        profile.userid=$1
        AND concepts.id=profile.conceptId
      ORDER BY
        profile.conceptidx,
        concepts.name
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

app.post(
  "/api/conceptsSelected",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    queryText = `
      INSERT INTO profile(
        userid, 
        conceptid
      )
      VALUES(
         $1,
         $2
      )
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

app.delete(
  "/api/conceptsSelected",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      DELETE FROM
        profile
      WHERE
        profile.userid=$1 
        AND profile.conceptid=$2
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
app.patch(
  "/api/conceptsSelected",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const conceptsSelected = JSON.stringify(req.body.conceptsSelected);
    const queryText = `
      UPDATE 
        profile
      AS
        p
      SET
        conceptidx=c.conceptidx
      FROM 
        json_populate_recordset(null::profile,'${conceptsSelected}')
      AS
        c
      WHERE
        c.userid=p.userid 
        AND c.conceptid=p.conceptid
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

app.get(
  "/api/aivideos",
  passport.authenticate("jwt", { session: false }),

  async (req, res) => {
    let queryText = `SELECT * FROM ai_videos`;

    try {
      let ai_videos = await psql.query(queryText);
      res.json(ai_videos);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.delete(
  "/api/aivideos",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let s3 = new AWS.S3();
    let queryText = `
      DELETE FROM
        ai_videos
      WHERE
        id=$1
      RETURNING *`;
    let queryText1 = `
      DELETE FROM
        users  
      WHERE
        username=$1
      RETURNING *
    `;
    var videoName = req.body.video.name;
    var splitName = videoName.split("_");
    var modelNamewithMP4 = splitName[splitName.length - 1];
    var modelName = modelNamewithMP4.split(".mp4")[0];

    try {
      let Objects = [];
      Objects.push({
        Key: process.env.AWS_S3_BUCKET_AIVIDEOS_FOLDER + req.body.video.name
      });
      let params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: {
          Objects: Objects
        }
      };
      let s3Res = await s3.deleteObjects(params, (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json(err);
        } else {
          console.log(data);
        }
      });

      let del = await psql.query(queryText, [req.body.video.id]);

      del = await psql.query(queryText1, [modelName]);

      res.json("deleted");
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

app.get(
  "/api/videos",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let userId = req.user.id;
    //These need to be updated using joins to become optimal
    let queryUserStartedVideos = `
      SELECT 
        videos.id,
        videos.filename,
        checkpoints.finished,
        checkpoints.timeinvideo,
        count.count
      FROM
        checkpoints
      LEFT JOIN (
        SELECT 
          videoid,
          count(*)
        FROM
          checkpoints 
        GROUP BY 
          videoid
      ) as count
      ON 
        count.videoid=checkpoints.videoid
      LEFT JOIN
        videos 
      ON 
        videos.id=checkpoints.videoid
      WHERE
        checkpoints.userid=$1
        AND checkpoints.finished=false
      ORDER BY
        videos.id
    `;
    let queryGlobalUnwatched = `
      SELECT 
        videos.id, 
        videos.filename,
        false as finished,
        0 as timeinvideo
      FROM 
        videos
      WHERE 
        id NOT IN (
          SELECT 
            videoid
          FROM
            checkpoints
        )
      ORDER BY
        videos.id
    `;
    let queryGlobalWatched = `
      SELECT DISTINCT
        videos.id, 
        videos.filename,
        checkpoints.finished,
      CASE WHEN 
        c.timeinvideo IS null
        THEN 
          0 
        ELSE 
          c.timeinvideo 
      END AS timeinvideo
      FROM
        checkpoints
      LEFT JOIN (
        SELECT
          videoid, 
          timeinvideo
        FROM
          checkpoints
        WHERE 
          userid=$1
      ) AS c
      ON 
        c.videoid=checkpoints.videoid
      LEFT JOIN
        videos
      ON
        videos.id=checkpoints.videoid
      WHERE 
        checkpoints.finished=true
      ORDER BY 
        videos.id
    `;
    let queryGlobalInProgress = `
      SELECT 
        DISTINCT ON (
          videos.id
        )
        videos.id,
        videos.filename,
        checkpoints.finished,
        CASE WHEN 
          c.timeinvideo IS null 
          THEN 
            0
          ELSE
            c.timeinvideo 
        END AS timeinvideo
      FROM
        checkpoints
      LEFT JOIN (
        SELECT
          videoid,
          timeinvideo
        FROM 
          checkpoints 
        WHERE 
          userid=$1
      ) AS c
      ON
        c.videoid=checkpoints.videoid
      LEFT JOIN
        videos
      ON
        videos.id=checkpoints.videoid
      WHERE 
        videos.id NOT IN (
          SELECT 
            videoid
          FROM
            checkpoints
          WHERE
            finished=true
        )
      ORDER BY
        videos.id
    `;
    try {
      const startedVideos = await psql.query(queryUserStartedVideos, [userId]);
      const unwatchedVideos = await psql.query(queryGlobalUnwatched);
      const watchedVideos = await psql.query(queryGlobalWatched, [userId]);
      const inProgressVideos = await psql.query(queryGlobalInProgress, [
        userId
      ]);
      const videoData = [
        startedVideos,
        unwatchedVideos,
        watchedVideos,
        inProgressVideos
      ];
      res.json(videoData);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/videos/:videoid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `SELECT 
        usernames.userswatching, 
        usernames.usersfinished,
        videos.* 
      FROM 
        (SELECT 
          videos.id,
          array_agg(users.username) AS userswatching, 
          array_agg(checkpoints.finished) AS usersfinished 
          FROM videos 
          FULL OUTER JOIN checkpoints 
          ON checkpoints.videoid=videos.id 
          LEFT JOIN users 
          ON users.id=checkpoints.userid 
          WHERE videos.id=$1 
          GROUP BY videos.id) 
        AS usernames 
      LEFT JOIN videos 
      ON videos.id=usernames.id`;
    try {
      const videoMetadata = await psql.query(queryText, [req.params.videoid]);
      res.json(videoMetadata.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// Get videos that users have viewed
app.get(
  "/api/videos/trainModel/:userIDs/:model",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
    SELECT DISTINCT v.id, v.filename
    FROM
      checkpoints c
    LEFT JOIN
      videos v
    ON
      v.id=c.videoid
    WHERE /* Get videos from only users selected */
      c.userid::text = ANY(string_to_array($1, ','))
    AND /* Exclude verification videos */
      NOT (v.id = ANY(
        SELECT 
          unnest(verificationvideos)
        FROM 
          models 
        WHERE 
          name=$2))
    AND /* Include only videos that have concepts model is training on */
      v.id IN (
        SELECT
          DISTINCT videoid
        FROM
          annotations
        WHERE
          conceptid = ANY(
            SELECT
              unnest(concepts)
            FROM
             models
            WHERE
              name=$2
          )
      )
    `;
    try {
      const videos = await psql.query(queryText, [
        req.params.userIDs,
        req.params.model
      ]);
      res.json(videos.rows);
    } catch (error) {
      console.log("Error in get /api/videos/trainModel/");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// summary getter ~KLS
app.get(
  "/api/videos/summary/:videoid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `SELECT * 
                      FROM concepts a 
                      JOIN 
                      (SELECT conceptid, videoid, COUNT(*) FROM annotations GROUP BY 
                      conceptid, videoid) AS counts 
                      ON counts.conceptid=a.id
                      WHERE videoid = $1`;
    try {
      const summary = await psql.query(queryText, [req.params.videoid]);
      res.json(summary.rows);
    } catch (error) {
      console.log("Error in get /api/videos/summary/:videoid");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/aivideos/summary/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [];
    var video = req.params.name;
    var splitted = video.split("_");
    var username = splitted[1].split(".mp4");
    params.push(username[0]); // username
    params.push(splitted[0]); // videoid
    console.log(params);

    let queryText = `SELECT *
      FROM concepts c
      JOIN
      ((SELECT conceptid, videoid,
        sum(case when username  = $1 then 1 else 0 end) as count,
        sum(case when username  <> $1 then 1 else 0 end) as notai
      FROM annotations a LEFT JOIN users u ON u.id = a.userid
      GROUP BY
      a.conceptid, a.videoid)
      ) AS counts

      ON counts.conceptid=c.id
      WHERE 
        videoid=$2
      AND
        c.id = ANY(SELECT unnest(concepts) from models m
        LEFT JOIN users u ON m.userid = u.id
        where username = $1);`;

    try {
      const summary = await psql.query(queryText, params);

      res.json(summary.rows);
    } catch (error) {
      console.log("Error in get /api/videos/summary/:videoid");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.patch(
  "/api/videos/:videoid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText =
      "UPDATE videos \
                   SET description=$1 \
                   WHERE id=$2 RETURNING *";
    try {
      const updateRes = await psql.query(queryText, [
        req.body.description,
        req.params.videoid
      ]);
      res.json(updateRes.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

app.delete(
  "/api/checkpoints/:videoid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userid = req.user.id;
    const videoid = req.params.videoid;
    const queryText =
      "DELETE FROM checkpoints \
                       WHERE userid=$1 \
                       AND videoid=$2\
                       RETURNING *";
    try {
      let deleteRes = await psql.query(queryText, [userid, videoid]);
      res.json({ message: "unwatched" });
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.put(
  "/api/checkpoints/:videoid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const videoid = req.params.videoid;
    const { timeinvideo, finished } = req.body;
    const userId = req.user.id;
    const data = [timeinvideo, finished, userId, videoid];
    let queryText =
      "UPDATE checkpoints \
                     SET timeinvideo=$1,\
                     timestamp=current_timestamp,\
                     finished=$2 \
                     WHERE userid=$3 AND videoid=$4";
    try {
      const updateRes = await psql.query(queryText, data);
      if (updateRes.rowCount > 0) {
        res.json({ message: "updated" });
        return;
      }
      // User has no checkpoint for this video
      queryText =
        "INSERT INTO checkpoints \
                 (timeinvideo, finished, userid, videoid, timestamp) \
                 VALUES($1, $2, $3, $4, current_timestamp)";
      let insertRes = await psql.query(queryText, data);
      res.json({ message: "updated" });
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// app.get('/api/videos/Y7Ek6tndnA/:name', (req, res) => {
//   var s3 = new AWS.S3();
//   const mimetype = 'video/mp4';
//   const file = process.env.AWS_S3_BUCKET_VIDEOS_FOLDER + req.params.name;
//   const cache = 0;
//   s3.listObjectsV2({
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     MaxKeys: 1, Prefix: file
//   }, (err, data) => {
//     if (err) {
//       return res.sendStatus(404);
//     }
//     if (!data.Contents[0]){
//       return res.redirect('/api/videos/Y7Ek6tndnA/error.mp4');
//     }
//     if (req != null && req.headers.range != null) {
//       var range = req.headers.range;
//       var bytes = range.replace(/bytes=/, '').split('-');
//       var start = parseInt(bytes[0], 10);
//       var total = data.Contents[0].Size;
//       var end = bytes[1] ? parseInt(bytes[1], 10) : total - 1;
//       var chunksize = (end - start) + 1;
//
//       res.writeHead(206, {
//         'Content-Range'  : 'bytes ' + start + '-' + end + '/' + total,
//         'Accept-Ranges'  : 'bytes',
//         'Content-Length' : chunksize,
//         'Last-Modified'  : data.Contents[0].LastModified,
//         'Content-Type'   : mimetype
//       });
//       s3.getObject({
//         Bucket: process.env.AWS_S3_BUCKET_NAME,
//         Key: file, Range: range
//       }).createReadStream().pipe(res);
//     }
//     else
//     {
//       res.writeHead(200,
//       {
//         'Cache-Control' : 'max-age=' + cache + ', private',
//         'Content-Length': data.Contents[0].Size,
//         'Last-Modified' : data.Contents[0].LastModified,
//         'Content-Type'  : mimetype
//       });
//       s3.getObject({
//         Bucket: process.env.AWS_S3_BUCKET_NAME,
//         Key: file
//       }).createReadStream().pipe(res);
//     }
//   });
// });

app.get(
  "/api/annotations",
  passport.authenticate("jwt", { session: false }),
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
      queryPass = queryPass + " AND annotations.unsure = true";
    }
    if (req.query.verifiedCondition === "verified only") {
      queryPass = queryPass + " AND annotations.verifiedby IS NOT NULL";
    } else if (req.query.verifiedCondition === "unverified only") {
      queryPass = queryPass + " AND annotations.verifiedby IS NULL";
    }
    if (req.query.admin !== "true") {
      queryPass = queryPass + " AND annotations.userid = $1";
      params.push(req.user.id);
    }
    // Adds query conditions from Report tree
    queryPass +=
      req.query.queryConditions + " ORDER BY annotations.timeinvideo";
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

app.post(
  "/api/annotations",
  passport.authenticate("jwt", { session: false }),
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
    const queryText =
      "INSERT INTO annotations(userid, videoid,\
                       conceptid, timeinvideo, \
                       x1, y1, x2, y2, \
                       videoWidth, videoHeight, \
                       image, imagewithbox, \
                       comment, unsure, dateannotated) \
                       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,\
                       $11, $12, $13, $14, current_timestamp) RETURNING *";
    try {
      let insertRes = await psql.query(queryText, data);
      res.json({
        message: "Annotated",
        value: JSON.stringify(insertRes.rows[0])
      });
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

app.patch(
  "/api/annotations",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    queryText =
      "UPDATE annotations \
                 SET conceptid = $1, comment = $2, unsure = $3 \
                 WHERE annotations.id=$4 OR annotations.originalid=$4 RETURNING *";
    queryUpdate =
      "SELECT annotations.id, annotations.comment,\
                   annotations.unsure, annotations.timeinvideo, \
                   annotations.videoWidth, annotations.videoHeight, \
                   annotations.imagewithbox, concepts.name \
                   FROM annotations, concepts \
                   WHERE annotations.id = $1 \
                   AND annotations.conceptid=concepts.id";
    try {
      await psql.query(queryText, [
        req.body.conceptId,
        req.body.comment,
        req.body.unsure,
        req.body.id
      ]);
      let updatedRow = await psql.query(queryUpdate, [req.body.id]);
      res.json(updatedRow.rows[0]);
    } catch (error) {
      console.log(error);
      res.json(error);
    }
  }
);

app.delete(
  "/api/annotations",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let s3 = new AWS.S3();
    let queryText = `
      DELETE FROM
        annotations \
      WHERE 
        annotations.id=$1 
        OR annotations.originalid=$1 
      RETURNING *`;
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

// in the future, this route as well as the /api/conceptImages route can
// be circumvented by using cloudfront
// app.get(
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

// app.get("/api/annotationImages/:id", async (req, res) => {
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

// app.get("/api/annotationImageWithoutBox/:id", async (req, res) => {
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

app.post(
  "/api/annotationImages",
  passport.authenticate("jwt", { session: false }),
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
        res.status(400).json(error);
      } else {
        res.json({ message: "successfully uploaded image to S3" });
      }
    });
  }
);

app.patch(
  "/api/updateImageBox",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let s3 = new AWS.S3();
    const key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.body.name;
    const params = {
      Key: key,
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      ContentEncoding: "base64",
      ContentType: "image/png",
      Body: Buffer(req.body.buf) //the base64 string is now the body
    };
    s3.putObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.status(400).json(error);
      } else {
        res.json({ message: "successfully uploaded image to S3" });
      }
    });
  }
);

let selectLevelQuery = level => {
  let queryPass = "";
  if (level === "Video") {
    queryPass =
      "SELECT videos.filename as name,\
                 videos.id as key,\
                 COUNT(*) as count, \
                 false as expanded\
                 FROM annotations, videos \
                 WHERE videos.id=annotations.videoid \
                 AND annotations.userid NOT IN (17, 32)";
  }
  if (level === "Concept") {
    queryPass =
      "SELECT concepts.name as name,\
                 concepts.id as key,\
                 COUNT(*) as count,\
                 false as expanded\
                 FROM annotations, concepts \
                 WHERE annotations.conceptid=concepts.id \
                 AND annotations.userid NOT IN (17, 32)";
  }
  if (level === "User") {
    queryPass =
      "SELECT users.username as name,\
                 users.id as key,\
                 COUNT(*) as count, \
                 false as expanded \
                 FROM annotations, users \
                 WHERE annotations.userid=users.id \
                 AND annotations.userid NOT IN (17, 32)";
  }
  return queryPass;
};

app.get(
  "/api/reportTreeData",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [];
    let queryPass = selectLevelQuery(req.query.levelName);
    if (req.query.queryConditions) {
      queryPass = queryPass + req.query.queryConditions;
    }
    if (req.query.unsureOnly === "true") {
      queryPass = queryPass + " AND annotations.unsure = true";
    }
    if (req.query.verifiedCondition === "verified only") {
      queryPass = queryPass + " AND annotations.verifiedby IS NOT NULL";
    } else if (req.query.verifiedCondition === "unverified only") {
      queryPass = queryPass + " AND annotations.verifiedby IS NULL";
    }
    if (req.query.admin !== "true") {
      queryPass = queryPass + " AND annotations.userid = $1";
      params.push(req.user.id);
    }
    queryPass = queryPass + " GROUP BY (name, key) ORDER BY count DESC";
    try {
      const data = await psql.query(queryPass, params);
      res.json(data.rows);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

app.get(
  "/api/models",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT m.name, m.timestamp, array_agg(c.name) concepts
      FROM 
        (SELECT 
          name, timestamp, UNNEST(concepts) concept
          FROM models
        ) m
      JOIN concepts c ON c.id=m.concept
      GROUP BY (m.name, m.timestamp)`;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.post(
  "/api/models",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        models(
          name,
          timestamp,
          concepts,
          verificationvideos)
      VALUES($1, current_timestamp, $2, $3)
      RETURNING *`;

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

app.get(
  "/api/users/annotationCount",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = parseInt(req.query.userid);
    const fromDate = req.query.fromdate;
    const toDate = req.query.todate;
    const data = [userId, fromDate, toDate];

    if (!userId) {
      res.status(500);
    }
    const queryText = `
      SELECT DISTINCT
        A.conceptid, 
        C.name, 
        COUNT(A.conceptid) AS total_count
      FROM 
        annotations A
      LEFT JOIN 
        concepts C 
      ON 
        A.conceptid = C.id
      WHERE
        A.userid = $1 
        AND (A.dateannotated BETWEEN $2 AND $3)
      GROUP BY 
        A.conceptid, 
        C.name`;
    try {
      let response = await psql.query(queryText, data);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/users/annotationCount");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.post(
  "/api/modelInstance",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let ec2 = new AWS.EC2({ region: "us-west-1" });

    let params = {
      InstanceIds: [req.body.modelInstanceId]
    };
    if (req.body.command === "stop") {
      ec2.stopInstances(params, (err, data) => {
        if (err) console.log(err, err.stack);
      });
    } else {
      ec2.startInstances(params, (err, data) => {
        if (err) console.log(err, err.stack);
      });
    }
  }
);

app.get(
  "/api/trainModel/concepts/:videoIDs/:modelName",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT
        *
      FROM 
        concepts
      WHERE
        concepts.id in (
          SELECT
            unnest(concepts)
          FROM
            models
          WHERE
            name=$1
        )
      AND
        concepts.id in (
          SELECT
            DISTINCT conceptid
          FROM
            annotations
          WHERE
            videoid::text = any(string_to_array($2, ','))
        )
    `;
    try {
      let response = await psql.query(queryText, [
        req.params.modelName,
        req.params.videoIDs
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/trainModel/concepts");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/modelTab/progress",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        *
      FROM 
        training_progress
      ORDER BY 
        id DESC
      LIMIT 1`;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/modelTab");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/modelTab/:option",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        *
      FROM 
        modeltab
      WHERE
        option = $1`;
    try {
      let response = await psql.query(queryText, [req.params.option]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/modelTab");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.put(
  "/api/modelTab/:option",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      UPDATE
        modeltab
      SET
        info = $1
      WHERE
        option = $2
      `;
    try {
      let response = await psql.query(queryText, [
        req.body.info,
        req.params.option
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on put /api/modelTab");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// Verify Annotations

app.get(
  "/api/unverifiedVideosByUser",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const selectedUsers = req.query.selectedUsers;
    let params = [selectedUsers];

    let queryText = `
      SELECT DISTINCT
        v.id, v.filename
      FROM 
        annotations a
      JOIN videos v ON v.id=a.videoid
      WHERE a.verifiedby IS NULL AND a.userid::text=ANY($1) ORDER BY v.id`;

    try {
      let videos = await psql.query(queryText, params);
      res.json(videos.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/unverifiedConceptsByUserVideo",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const selectedUsers = req.query.selectedUsers;
    const selectedVideos = req.query.selectedVideos;
    let params = [selectedUsers];

    let queryText = `SELECT DISTINCT c.id, c.name
        FROM annotations a
        LEFT JOIN concepts c ON c.id=conceptid
        WHERE a.verifiedby IS NULL AND a.userid::text=ANY($1)`;

    if (!(selectedVideos.length === 1 && selectedVideos[0] === "-1")) {
      queryText += ` AND a.videoid::text=ANY($${params.length + 1})`;
      params.push(selectedVideos);
    }

    queryText += ` ORDER BY c.name`;

    try {
      let concepts = await psql.query(queryText, params);
      res.json(concepts.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/unverifiedUnsureByUserVideoConcept",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const selectedUsers = req.query.selectedUsers;
    const selectedVideos = req.query.selectedVideos;
    const selectedConcepts = req.query.selectedConcepts;

    let params = [selectedUsers];
    let queryText = `SELECT distinct a.unsure
      FROM annotations a
      LEFT JOIN concepts c ON c.id=conceptid
      LEFT JOIN users u ON u.id=userid
      LEFT JOIN videos v ON v.id=videoid
      WHERE a.verifiedby IS NULL AND a.userid::text=ANY($1)`;

    if (!(selectedVideos.length === 1 && selectedVideos[0] === "-1")) {
      queryText += ` AND a.videoid::text=ANY($${params.length + 1})`;
      params.push(selectedVideos);
    }

    if (!(selectedConcepts.length === 1 && selectedConcepts[0] === "-1")) {
      queryText += ` AND a.conceptid::text=ANY($${params.length + 1})`;
      params.push(selectedConcepts);
    }

    try {
      let concepts = await psql.query(queryText, params);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.get(
  "/api/unverifiedAnnotationsByUserVideoConceptUnsure",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const selectedUsers = req.query.selectedUsers;
    const selectedVideos = req.query.selectedVideos;
    const selectedConcepts = req.query.selectedConcepts;
    const selectedUnsure = req.query.selectedUnsure;

    let params = [selectedUsers];

    let queryText = `SELECT distinct a.*, c.name, u.username, v.filename
      FROM annotations a
      LEFT JOIN concepts c ON c.id=conceptid
      LEFT JOIN users u ON u.id=userid
      LEFT JOIN videos v ON v.id=videoid
      WHERE a.verifiedby IS NULL AND a.userid::text=ANY($1)`;

    if (!(selectedVideos.length === 1 && selectedVideos[0] === "-1")) {
      queryText += ` AND a.videoid::text=ANY($${params.length + 1})`;
      params.push(selectedVideos);
    }

    if (!(selectedConcepts.length === 1 && selectedConcepts[0] === "-1")) {
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

app.patch(
  `/api/annotationsVerify`,
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const verifiedby = req.user.id;
    const id = req.body.id;
    let s3 = new AWS.S3();

    let params = [id, verifiedby];
    let queryText1 = `UPDATE annotations SET verifiedby=$2, verifieddate=current_timestamp, originalid=null`;

    if (req.body.conceptid !== null) {
      queryText1 += `, conceptid=$3, oldconceptid=$4, priority=priority+3`;
      params.push(req.body.conceptid);
      params.push(req.body.oldconceptid);
    } else {
      queryText1 += `, priority= priority+1`;
    }
    params.push(req.body.comment);
    queryText1 += `, comment=$` + params.length;
    params.push(req.body.unsure);
    queryText1 += `, unsure=$` + params.length;
    queryText1 += ` WHERE id=$1`;

    const queryText2 = `
      DELETE FROM
        annotations \
      WHERE 
        originalid=$1 
        and annotations.id<>$1
      RETURNING *`;

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
      await s3.deleteObjects(params);
      res.json("verified");
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// Update box coordinates
app.patch(
  "/api/annotationsUpdateBox",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const params = Object.values(req.body);
    const queryText = `
    UPDATE
      annotations 
    SET 
      x1=$1, y1=$2, x2=$3, y2=$4, 
      oldx1=$5, oldy1=$6, oldx2=$7, oldy2=$8,
      priority = priority+1 
    WHERE id=$9`;

    try {
      let update = await psql.query(queryText, params);
      res.json(update.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// This websocket sends a list of videos to the client that update in realtime
io.on("connection", socket => {
  console.log("socket connected!");
  socket.on("connect_failed", () => {
    console.log("socket connection failed");
  });
  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });
  socket.on("refresh videos", () => {
    socket.broadcast.emit("refresh videos");
  });
  socket.on("refresh predictmodel", () => {
    socket.broadcast.emit("refresh predictmodel");
  });
  socket.on("refresh trainmodel", () => {
    //Model Tab: Train info needs to be updated
    socket.broadcast.emit("refresh trainmodel");
  });
});

// Express only serves static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client", "build")));
  app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

app.set("port", process.env.PORT || 3001);

server.listen(app.get("port"), () => {
  console.log(`Find the server at: http://localhost:${app.get("port")}/`);
});
