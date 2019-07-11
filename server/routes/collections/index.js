const router = require('express').Router();

router.use('/concepts', require('./concepts'))
router.use('/videos', require('./videos'))

module.exports = router;
