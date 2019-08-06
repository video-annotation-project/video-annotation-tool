const AWS = require('aws-sdk');

// This function sets the cookies that are used by the client to access the
// videos on AWS CloudFront
const setCookies = res => {
  const keyPairId = process.env.KEY_PAIR_ID;
  const privateKey = process.env.RSA_PRIVATE_KEY.split('\\n').join('\n');
  let cdnUrl = 'cdn.deepseaannotations.com';
  let expiry = Math.floor(Date.now() / 1000) + 99960000;

  let policy = {
    Statement: [
      {
        Resource: 'https://' + cdnUrl + '/*',
        Condition: {
          DateLessThan: { 'AWS:EpochTime': expiry }
        }
      }
    ]
  };
  let policyString = JSON.stringify(policy);

  let signer = new AWS.CloudFront.Signer(keyPairId, privateKey);
  let options = { url: 'https://' + cdnUrl, policy: policyString };
  signer.getSignedCookie(options, (error, cookies) => {
    if (error) {
      console.log('Error recieved from getSignedCookie function.');
      console.log('Throwing error.');
      throw error;
    }
    for (cookieName in cookies) {
      res.cookie(cookieName, cookies[cookieName], {
        domain: '.deepseaannotations.com',
        expires: new Date(expiry * 1000),
        httpOnly: true,
        path: '/',
        secure: true
      });
    }
  });
};

module.exports = setCookies;
