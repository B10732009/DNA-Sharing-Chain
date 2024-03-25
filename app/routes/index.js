let express = require('express');
let router = express.Router();
let path = require('path');

/* GET home page. */
router.get('/', function (req, res, next) {
    // res.render('index', { title: 'Express' });
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.post('/', function (req, res) {
    // show form data here
    console.log(req.body.login, req.body.apply_identity);

    if (req.body.login !== undefined) {
        res.redirect('/login');
    }
    else {
        res.redirect('/apply_identity');
    }
});

module.exports = router;
