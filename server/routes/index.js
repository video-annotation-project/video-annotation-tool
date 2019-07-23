const router = require('express').Router();

router.use('/annotations', require('./annotations'))
router.use('/collections', require('./collections'))
router.use('/concepts', require('./concepts'))
router.use('/models', require('./models'))
router.use('/users', require('./users'))
router.use('/videos', require('./videos'))

module.exports = router;
