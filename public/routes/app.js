const express = require('express');
const router = express.Router();
router.use(express.json());
const ds = require('../datastore.js');


/* --------------------Routes-------------------- */

router.get('/', async(req, res) => {
    if (!req.oidc.isAuthenticated()) {
        res.render('welcome');
    } else {
        let user = {
            jwt: req.oidc.idToken,
            id: req.oidc.user.sub,
            nickname: req.oidc.user.nickname,
            email: req.oidc.user.email
        };

        // add new users to datastore
        await ds.postUser(user);
        res.render('userInfo', user);
    }
});

// Error handlers
router.use((req, res, next) => {
    res.sendStatus(404);
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.sendStatus(500);
});


/* --------------------Exports-------------------- */

module.exports = router;