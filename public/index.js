const router = module.exports = require('express').Router();

router.use('/users', require('./routes/user'));
router.use('/dogs', require('./routes/dog'));
router.use('/services', require('./routes/service'));
router.use('/', require('./routes/app'));
