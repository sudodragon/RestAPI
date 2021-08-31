const express = require('express');
const router = express.Router();
const ds = require('../datastore');
const KIND = ds.USERS;


/* --------------------Functions-------------------- */

const f = require('../functions.js');
let reqAcceptsJSON = f.reqAcceptsJSON;


/* --------------------Routes-------------------- */

// Get all users
router.get('/', async (req, res) => {
    if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else {
        const entities = await ds.getItems(req, KIND);
        res.status(200).json(entities);
    }
});

// Other users routes -- NOT ALLOWED
router.all('/', (req, res) => {
    res.status(405).set('Allow', 'GET').end();
});


/* --------------------Exports-------------------- */

module.exports = router;