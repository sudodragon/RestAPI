/* --------------------Functions-------------------- */

function valuesAreDefined(item) {
    /* Returns true if each expected parameter has been passed in the req params and is defined*/
    result = true;
    Object.values(item).forEach(value => {
        if (value == undefined) {
            result = false;
        }
    });
    return result;
}

function reqAcceptsJSON(req){
    return (req.headers.accept == 'application/json'); 
}

function isValidContentType(req) {
    /* Returns true if request body format is json */
    return req.headers['content-type'] == 'application/json';
}

function removeIdFromArray(array, id) {
    /*
     * Returns a new array that does not include the passed id value, 
     * or returns undefined if no items remain after filtering
     */

    let reduced = array.filter((listId) => {
        return listId !== id;
    });

    if (reduced.length == 0) {
        return undefined
    }
    return reduced;
}

function areValidAttributes(item) {
    /* Returns true if weight is a positive number and all other request attributes are non-empty strings */
    // Weight is a positive number
    if (item.weight !== undefined) {
        if (typeof item.weight !== 'number' || item.weight <= 0) {
            return false;
        }
    }

    // All other values are non-empty strings
    for (const [key, value] of Object.entries(item)) {
        if (key != 'weight') {
            if (typeof value !== 'string' || value === '') {
                return false;
            }
        }
    }

    return true;
}


/* --------------------Exports-------------------- */

module.exports = {
    valuesAreDefined: valuesAreDefined,
    reqAcceptsJSON: reqAcceptsJSON,
    isValidContentType: isValidContentType,
    removeIdFromArray: removeIdFromArray,
    areValidAttributes: areValidAttributes
}