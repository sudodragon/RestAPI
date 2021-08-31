const express = require('express');
const router = express.Router();
const ds = require('../datastore.js');
const KIND = ds.SERVICES;
const DOG = ds.DOGS;
const SERVICE = ds.SERVICES;
router.use(express.json());


/* --------------------Functions-------------------- */

const f = require('../functions.js');
let isValidContentType = f.isValidContentType;
let valuesAreDefined = f.valuesAreDefined;
let removeIdFromArray = f.removeIdFromArray;
let areValidAttributes = f.areValidAttributes;
let reqAcceptsJSON = f.reqAcceptsJSON;


/* --------------------Routes-------------------- */

// Add a service
router.post('/', async (req, res) => {
    let item = {
        type: req.body.type,
        frequency: req.body.frequency,
        technician: req.body.technician
    }
    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else if (!valuesAreDefined(item) || !areValidAttributes(item)) {
        res.status(400).send({ Error: 'Invalid request parameters' });
    } else {
        let key = await ds.postDS(item, KIND);
        let entity = await ds.getByKey(key);
        entity.self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id;
        res.status(201).json(entity);
    }
});

// Get a service
router.get('/:id', async (req, res) => {
    if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else {
        let id = req.params.id;
        let entity = await ds.getById(id, KIND);
        if (entity == undefined) {
            res.status(404).send({ Error: 'No service with this id exists' })
        } else {
            entity.self = req.protocol + '://' + req.get('host') + req.originalUrl;
            res.status(200).json(entity);
        }
    }
});

// Get all services
router.get('/', async (req, res) => {
    if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else {
        const entities = await ds.getItems(req, KIND);
        // add self url to each item returned
        entities.items.forEach(entity => {
            entity.self = req.protocol + '://' + req.get('host') + '/services/' + entity.id;
        });
        res.status(200).json(entities);
    }
});

// Partially edit a service
router.patch('/:id', async (req, res) => {
    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else if (req.body.id || req.body.dogs || !areValidAttributes(req.body)) {
        res.status(400).send({ Error: 'Invalid request parameters' })
    } else {
        let id = req.params.id;
        let entity = await ds.getById(id, KIND);
        if (entity == undefined) {
            res.status(404).send({ Error: 'No service with this id exists' });
        } else {
            let updates = {
                type: req.body.type || entity.type,
                frequency: req.body.frequency || entity.frequency,
                technician: req.body.technician || entity.technician
            }
            for (const [key, value] of Object.entries(updates)) {
                entity[key] = value;
            }
            await ds.putDS(id, KIND, entity);
            let updated = await ds.getById(id, KIND);

            updated.self = req.protocol + '://' + req.get('host') + req.originalUrl;
            res.status(200).json(updated);
        }
    }
});

// Patch all services -- NOT ALLOWED
router.patch('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Reset all attributes for a single service
router.put('/:id', async (req, res) => {
    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else if (req.body.id || req.body.dogs || !areValidAttributes(req.body)) {
        res.status(400).send({ Error: 'Invalid request parameters' });
    } else {
        let updates = {
            type: req.body.type || 'default',
            frequency: req.body.frequency || 'default',
            technician: req.body.technician || 'default'
        }
        let id = req.params.id;
        let entity = await ds.getById(id, KIND);
        if (entity == undefined) {
            res.status(404).send({ Error: 'No service with this id exists' });
        } else {
            for (const [key, value] of Object.entries(updates)) {
                entity[key] = value;
            }
            await ds.putDS(id, KIND, entity);
            let updated = await ds.getById(id, KIND);

            updated.self = req.protocol + '://' + req.get('host') + req.originalUrl;
            res.status(200).json(updated);
        }
    }
});

// Put all services -- NOT ALLOWED
router.put('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Delete a service
router.delete('/:id', async (req, res) => {
    let serviceId = req.params.id;
    let serviceKey = await ds.makeKey(serviceId, SERVICE);
    let service = await ds.getByKey(serviceKey);
    if (service == undefined) {
        res.status(404).send({ Error: 'No service with this id exists' });
    } else {
        if (service.dogs !== undefined) {
            // remove service from associated dogs
            service.dogs.forEach(async (dogId) => {
                let dog = await ds.getById(dogId, DOG);
                dog.services = removeIdFromArray(dog.services, serviceId);
                await ds.putDS(dogId, DOG, dog);
            });
        }
        await ds.deleteDS(serviceKey);
        res.sendStatus(204).end();
    }
});

// Delete all services -- NOT ALLOWED
router.delete('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});


/* --------------------Exports-------------------- */

module.exports = router;