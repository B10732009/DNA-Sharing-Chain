let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/index', function (req, res, next) {
    res.render('index', { title: 'Express' });
    // res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/', function (req, res, next) {
    res.redirect('/index');
});

module.exports = router;
