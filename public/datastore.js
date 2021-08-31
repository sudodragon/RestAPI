const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();

const SERVICES = 'Services';
const DOGS = 'Dogs';
const USERS = 'Users';


/* --------------------Functions-------------------- */

async function fromDatastore(item) {
    /* Returns the passed item with Datastore id value as an attribute */
    if (item[Datastore.KEY].id == undefined) {
        item.id = item[Datastore.KEY].name;
    } else {
        item.id = item[Datastore.KEY].id;
    }
    return item;
}

async function getItems(req, kind) {
    /* Returns results object containing count of items, items, and next. */
    let countQ = datastore.createQuery(kind);
    let allEntities = await datastore.runQuery(countQ);
    let count = allEntities[0].length;

    let q = datastore.createQuery(kind).limit(5);
    const results = {};
    if (Object.keys(req.query).includes('cursor')) {
        q = q.start(req.query.cursor);
    }
    const entities = await datastore.runQuery(q);
    results.count = count;
    results.items = entities[0];
    results.items.forEach(item => {
        item = fromDatastore(item);
    });

    if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
        results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + entities[1].endCursor;
    }
    return results;
}

async function getItemsByOwner(req, user, kind) {
    /* Returns results object with items filtered by owner */
    let countQ = datastore.createQuery(kind).filter('owner', '=', user);
    let allEntities = await datastore.runQuery(countQ);
    let count = allEntities[0].length;

    let q = datastore.createQuery(kind).filter('owner', '=', user).limit(5);
    const results = {};
    if (Object.keys(req.query).includes('cursor')) {
        q = q.start(req.query.cursor);
    }
    const entities = await datastore.runQuery(q);
    results.count = count;
    results.items = entities[0];
    results.items.forEach(item => {
        item = fromDatastore(item);
    });

    if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
        results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + entities[1].endCursor;
    }
    return results;
}

async function postDS(item, kind) {
    /* Posts an item to datastore */
    var key = datastore.key(kind);
    await datastore.save({ 'key': key, 'data': item });
    return key;
}

async function postUser(user) {
    /* Posts a user to the datastore */
    const key = datastore.key([USERS, user.id]);
    const entity = {
        key: key,
        data: {
            email: user.email,
            nickname: user.nickname
        }
    };
    return datastore.save(entity);
}

async function makeKey(id, kind) {
    /* Returns a datastore key */
    if (kind == USERS) {
        return datastore.key([kind, id]);
    } else {
        return datastore.key([kind, parseInt(id, 10)]);
    }
}

async function getById(id, kind) {
    /* Returns the item from the datastore that matches the passed id and kind */
    const key = await makeKey(id, kind);
    const item = await getByKey(key);
    return item;
}

async function getByKey(key) {
    /* Returns the item from the datastore that matches the passed key */
    const entity = await datastore.get(key);
    if (entity[0] === undefined) {
        return undefined;
    }
    const item = await fromDatastore(entity[0]);
    return item;
}

async function putDS(id, kind, item) {
    /* Updates the item in the datastore that matches the passed id and kind with the item's values */
    const key = await makeKey(id, kind);
    return datastore.save({ 'key': key, 'data': item });
}

async function deleteDS(key) {
    /* Deletes an item from the datastore that matches the passed key */
    await datastore.delete(key);
}


/* --------------------Exports-------------------- */

module.exports = {
    Datastore: Datastore,
    datastore: datastore,
    SERVICES: SERVICES,
    DOGS: DOGS,
    USERS: USERS,
    fromDatastore: fromDatastore,
    getItems: getItems,
    postDS: postDS,
    postUser: postUser,
    getByKey: getByKey,
    makeKey: makeKey,
    getById: getById,
    putDS: putDS,
    deleteDS: deleteDS,
    getItemsByOwner: getItemsByOwner
}


/* --------------------Resources-------------------- */

// https://stackoverflow.com/questions/8595509/how-do-you-share-constants-in-nodejs-modules