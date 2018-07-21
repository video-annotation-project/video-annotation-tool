var AWS = require('aws-sdk');
AWS.config.update(
  {
    accessKeyId: "AKIAJNWHPK4ZDHYUNDZQ",
    secretAccessKey: "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",
  }
);
var s3 = new AWS.S3();
s3.getObject(
  { Bucket: "lubomirstanchev", Key: "concept_images/Abraliopsis_01.png" },
  function (error, data) {
    if (error != null) {
      console.log("Failed to retrieve an object: " + error);
    } else {
      console.log("Loaded " + data.ContentLength + " bytes");
      // do something with data.Body
    }
  }
);
