const express = require('express');
const router = express.Router();
const ds = require('../datastore.js');
const dotenv = require('dotenv');
dotenv.config();

const KIND = ds.DOGS;
const DOG = ds.DOGS;
const SERVICE = ds.SERVICES;
const USER = ds.USERS;

router.use(express.json());


/* --------------------Auth-------------------- */

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    issuer: `${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
});

// Middleware to protect all dog routes
router.use(checkJwt);
router.use((err, req, res, next) => {
    if (err) {
        res.status(401).send({ Error: 'Unauthorized -- ' + err.message });
    }
});


/* --------------------Functions-------------------- */

const f = require('../functions.js');
let isValidContentType = f.isValidContentType;
let valuesAreDefined = f.valuesAreDefined;
let removeIdFromArray = f.removeIdFromArray;
let areValidAttributes = f.areValidAttributes;
let reqAcceptsJSON = f.reqAcceptsJSON;

function arrayContainsId(array, id) {
    /* Returns true if the passed id is contained in the passed array */
    let result = false;
    if (array != undefined) {
        array.forEach(item => {
            if (item == id) {
                result = true;
            }
        });
        return result;
    }
}


/* --------------------Routes-------------------- */

// Add a dog
router.post('/', async (req, res) => {
    let userId = req.user.sub;
    let item = {
        name: req.body.name,
        breed: req.body.breed,
        weight: req.body.weight,
        owner: userId
    }

    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else if (!valuesAreDefined(item) || !areValidAttributes(item)) {
        res.status(400).send({ Error: 'Invalid request parameters' });
    } else {
        let dogKey = await ds.postDS(item, KIND);
        let dog = await ds.getByKey(dogKey);

        // update owner
        const owner = await ds.getById(userId, USER);
        if (owner.dogs == undefined) {
            owner.dogs = [dog.id];
        } else {
            owner.dogs.push(dog.id);
        }
        await ds.putDS(userId, USER, owner);

        dog.self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + dog.id;
        res.status(201).json(dog);
    }
});

// Get a dog
router.get('/:id', async (req, res) => {
    let userId = req.user.sub;

    if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else {
        let dogId = req.params.id;
        let dog = await ds.getById(dogId, KIND);
        if (dog == undefined || dog.owner != userId) {
            res.status(404).send({ Error: 'No dog with this id exists for the logged in user' });
        } else {
            dog.self = req.protocol + '://' + req.get('host') + req.originalUrl;
            res.status(200).json(dog);
        }
    }
});

// Get all dogs
router.get('/', async (req, res) => {
    if (!reqAcceptsJSON(req)) {
        res.status(406).send({ Error: 'Request header must accept application/json' });
    } else {
        let userId = req.user.sub;
        const entities = await ds.getItemsByOwner(req, userId, KIND);
        // add self url to each item returned
        entities.items.forEach(entity => {
            entity.self = req.protocol + '://' + req.get('host') + '/dogs/' + entity.id;
        });
        res.status(200).json(entities);
    }
});

// Partially edit a dog
router.patch('/:id', async (req, res) => {
    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({Error: 'Request header must accept application/json'});
    } else if (req.body.id || req.body.services || !areValidAttributes(req.body)) {
        res.status(400).send({ Error: 'Invalid request parameters' })
    } else {
        let userId = req.user.sub;
        let dogId = req.params.id;
        let dog = await ds.getById(dogId, KIND);
        if (dog == undefined || dog.owner != userId) {
            res.status(404).send({ Error: 'No dog with this id exists for the logged in user' });
        } else {
            let updates = {
                name: req.body.name || dog.name,
                breed: req.body.breed || dog.breed,
                weight: req.body.weight || dog.weight
            }

            for (const [key, value] of Object.entries(updates)) {
                dog[key] = value;
            }
            await ds.putDS(dogId, KIND, dog);
            let updated = await ds.getById(dogId, KIND);

            updated.self = req.protocol + '://' + req.get('host') + req.originalUrl;
            res.status(200).json(updated);
        }
    }
});

// Patch all dogs -- NOT ALLOWED
router.patch('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Reset all attributes for a single dog
router.put('/:id', async (req, res) => {
    if (!isValidContentType(req)) {
        res.status(406).send({ Error: 'Server only accepts application/json data' });
    } else if (!reqAcceptsJSON(req)) {
        res.status(406).send({Error: 'Request header must accept application/json'});
    } else if (req.body.id || req.body.services || !areValidAttributes(req.body)) {
        res.status(400).send({ Error: 'Invalid request parameters' });
    } else {
        let updates = {
            name: req.body.name || 'default',
            breed: req.body.breed || 'default',
            weight: req.body.weight || 1
        }
        let userId = req.user.sub;
        let id = req.params.id;
        let entity = await ds.getById(id, KIND);
        if (entity == undefined || entity.owner != userId) {
            res.status(404).send({ Error: 'No dog with this id exists for the logged in user' });
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

// Put all dogs -- NOT ALLOWED
router.put('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Delete a dog
router.delete('/:id', async (req, res) => {
    let userId = req.user.sub;
    let dogId = req.params.id;
    let dogKey = await ds.makeKey(dogId, KIND);
    let dog = await ds.getByKey(dogKey);
    if (dog == undefined || dog.owner != userId) {
        res.status(404).send({ Error: 'No dog with this id exists for the logged in user' });
    } else {
        if (dog.services !== undefined) {
            // remove dog from associated services
            dog.services.forEach(async (serviceId) => {
                let service = await ds.getById(serviceId, SERVICE);
                service.dogs = removeIdFromArray(service.dogs, dogId);
                await ds.putDS(serviceId, SERVICE, service);
            });
        }

        // remove dog from associated owner
        let owner = await ds.getById(userId, USER);
        owner.dogs = removeIdFromArray(owner.dogs, dogId);
        await ds.putDS(userId, USER, owner);

        await ds.deleteDS(dogKey);
        res.sendStatus(204).end();
    }
});

// Delete all dogs -- NOT ALLOWED
router.delete('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Assign a service to a dog
router.put('/:dog_id/services/:service_id', async (req, res) => {
    let userId = req.user.sub;
    let dogId = req.params.dog_id;
    let dog = await ds.getById(dogId, DOG);
    let serviceId = req.params.service_id;
    let service = await ds.getById(serviceId, SERVICE);

    if (dog == undefined || service == undefined) {
        res.status(404).send({ Error: 'The specified dog and/or service does not exist' });
    } else if (dog.owner != userId) {
        res.status(403).send({ Error: 'The specified dog does not belong to the logged in user' });
    } else if (arrayContainsId(dog.services, serviceId)) {
        res.status(400).send({ Error: 'This service is already assigned to this dog' });
    } else {
        if (dog.services == undefined) {
            dog.services = [serviceId];
        } else {
            dog.services.push(serviceId);
        }

        if (service.dogs == undefined) {
            service.dogs = [dogId];
        } else {
            service.dogs.push(dogId);
        }

        await ds.putDS(dogId, DOG, dog);
        await ds.putDS(serviceId, SERVICE, service);
        res.sendStatus(204).end();
    }
});

// Remove a service from a dog
router.delete('/:dog_id/services/:service_id', async (req, res) => {
    let userId = req.user.sub;
    let dogId = req.params.dog_id;
    let serviceId = req.params.service_id;
    let dog = await ds.getById(dogId, DOG);
    let service = await ds.getById(serviceId, SERVICE);
    if (dog == undefined || service == undefined || !arrayContainsId(dog.services, serviceId)) {
        res.status(404).send({ Error: 'No service with this service_id is assigned to the dog with this dog_id' });
    } else if (dog.owner != userId) {
        res.status(403).send({ Error: 'The specified dog does not belong to the logged in user' });
    } else {
        // update dog
        dog.services = removeIdFromArray(dog.services, serviceId);

        // update service
        service.dogs = removeIdFromArray(service.dogs, dogId);

        await ds.putDS(serviceId, SERVICE, service);
        await ds.putDS(dogId, DOG, dog);
        res.sendStatus(204).end();
    }
});


/* --------------------Exports-------------------- */

module.exports = router;


/* --------------------Resources-------------------- */

// https://www.oreilly.com/library/view/full-stack-react-projects/9781788835534/e75534d3-6d96-4628-8b7f-b84c5ddb8f0d.xhtml
// https://stackoverflow.com/questions/40970329/how-to-handle-errors-with-express-jwt
// https://github.com/auth0/express-jwt/issues/189 
// https://flaviocopes.com/how-to-check-value-is-number-javascript/