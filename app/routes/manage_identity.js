let express = require('express');
let router = express.Router();

router.get('/', function (req, res, next) {
    res.render('manage_identity');
});

module.exports = router;
