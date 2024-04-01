let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('register', { title: 'Express' });
});

router.post('/', async function (req, res) {
    
});

module.exports = router;
