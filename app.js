// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START gae_flex_datastore_app]
'use strict';

const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.enable('trust proxy');

// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GOOGLE_CLOUD_PROJECT environment variable. See
// https://github.com/GoogleCloudPlatform/google-cloud-node/blob/master/docs/authentication.md
// These environment variables are set automatically on Google App Engine
const {Datastore} = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = new Datastore();
//const router = express.Router();


function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}


/* Models */
class Boat {
  constructor(name, type, length) {
    this.boat_name = name;
    this.type = type;
    this.length = length;
  }

  static get key() {
    return "boat2";
  }
}

class Slip {
  constructor(number, current_boat) {
    this.number = number;
    this.current_boat = current_boat;
  }

  static get key() {
    return "slip";
  }
}

/* end Models */

/* Boat controllers */
const insertBoat = (boat) => {
  return datastore.save({
    key: datastore.key(Boat.key),
    data: boat,
  });
};

const getBoat = (id) => {
  // get by id
  const key = datastore.key([Boat.key, parseInt(id,10)]);
  return datastore.get(key);
};

const getAllBoats = () => {
  const query = datastore.createQuery(Boat.key)

  return datastore.runQuery(query).then( (entities) => {
  			return entities[0].map(fromDatastore);
  });
};

const updateBoat = (id, boat) => {
  // update by id
  const key = datastore.key([Boat.key, parseInt(id,10)]);
  return datastore.update({
    key: key,
    data: boat,
  });
};

const deleteBoat = (id) => {
  // delete by id
  const key = datastore.key([Boat.key, parseInt(id,10)]);
  return datastore.delete(key);
};
/* end Boat controllers */

/* Slip controllers */
const insertSlip = (slip) => {
  return datastore.save({
    key: datastore.key(Slip.key),
    data: slip,
  });
};

const getSlip = (id) => {
  // get by id
  const key = datastore.key([Slip.key, parseInt(id,10)]);
  return datastore.get(key);
};

const getAllSlips = () => {
  const query = datastore.createQuery(Slip.key)

  return datastore.runQuery(query).then( (entities) => {
  			return entities[0].map(fromDatastore);
  });
};

const deleteSlip = (id) => {
  // delete by id
  const key = datastore.key([Slip.key, parseInt(id,10)]);
  return datastore.delete(key);
};

const updateSlip = (id, slip) => {
  // set current_boat = boatId
  const key = datastore.key([Slip.key, parseInt(id,10)]);
  return datastore.update({
    key: key,
    data: slip,
  });
};

/* end Slip controllers */

/* Slip routes */

// Create a Slip
app.post('/slips', function(req, res) {

  // TODO check param existence
  if(req.body.number === undefined) {
    res
      .status(400)
      .send({error: "Missing parameters"})
      .end();
  } else {
      const slip = new Slip(req.body.number, null);
      insertSlip(slip).then( result => {res.status(201).send('{ "id": ' + result[0].mutationResults[0].key.path[0].id + ' }').end()});
  }
});

// Get a single Slip
app.get('/slips/:slip_id', function(req, res) {
  // 200 success
  // 404 if not exists
  getSlip(req.params.slip_id).then( (entity) => {
    if(entity[0] === undefined) {
      res.status(404).end();
    } else {
      console.log(entity);
      res.status(200).json(entity[0]).end();
    }
  });
});

// Get all Slips
app.get('/slips', function(req, res) {

  getAllSlips().then( (slips) => {
      res.status(200).json(slips).end();
  });
});

// Delete a Slip
// FINISHED
app.delete('/slips/:slip_id', function(req, res) {
  // 204 success
  // 404 if not exists
  getSlip(req.params.slip_id).then( (entity) => {
    if(entity[0] === undefined) {
      res.status(404).send("Slip not found").end();
    } else {
      deleteSlip(req.params.slip_id).then( () => {
        res.status(204).end();
      });
    }
  });
});

// Boat arrives at Slip
app.put('/slips/:slip_id/:boat_id', function(req, res) {
  // 204 success
  // 403 if not empty
  // 404 if not exists (boat or slip)

  const boatId = req.params.boat_id;
  const slipId = req.params.slip_id;

  getSlip(slipId).then( (slipEntities) => {
    slipEntity = slipEntities[0];
    if(slipEntity === undefined) {
      // Slip doesn't exist
      res.status(404).send({error: "Slip not found"}).end();
    } else {
      // Slip exists
      if(slipEntity.current_boat !== null) {
        // Slip has boat in it
        res.status(403).send({error: "Slip occupied"}).end();
      } else {
        getBoat(boatId).then( (boatEntities) => {
          if(boatEntities[0] === undefined) {
            // Boat doesn't exist
            res.status(404).end();
          } else {
            // Update current_boat field on slip
            slipEntity.current_boat = boatId;
            updateSlip(slipId, slipEntity).then( () => {
              // Success
              res.status(204).send({error: "Boat not found"}).end();
            });
          }
        });
      }
    }
  });
});

// Boat departs Slip
app.put('/slips/:slip_id/:boat_id', function(req, res) {
  // 204 success
  // 404 if not exists (boat or slip)

  const boatId = req.params.boat_id;
  const slipId = req.params.slip_id;

  getSlip(slipId).then( (slipEntities) => {
    slipEntity = slipEntities[0];
    if(slipEntity === undefined) {
      // Slip doesn't exist
      res.status(404).send({error: "Slip not found"}).end();
    } else {
      // Slip exists
      if(slipEntity.current_boat === null) {
        // Slip doesn't have boat in it
        res.status(404).send({error: "Slip not occupied"}).end();
      } else {
        getBoat(boatId).then( (boatEntities) => {
          if(boatEntities[0] === undefined) {
            // Boat doesn't exist
            res.status(404).send({error: "Boat not found"}).end();
          } else {
            // Update current_boat field on slip
            slipEntity.current_boat = null;
            updateSlip(slipId, slipEntity).then( () => {
              // Success
              res.status(204).end();
            });
          }
        });
      }
    }
  });
});

/* end Slip routes */

/* Boat routes */

// Create a Boat
app.post('/boats', function(req, res) {
  // Validate params
  if(req.body.name === undefined || req.body.type === undefined || req.body.length === undefined) {
    res.status(400).send({error: "Missing parameters"}).end();
  } else {
      const boat = new Boat(req.body.name, req.body.type, req.body.length);
      insertBoat(boat).then( key => {res.status(201).send('{ "id": ' + result[0].mutationResults[0].key.path[0].id + ' }').end()} );
  }
});

// Get a single Boat
app.get('/boats/:boat_id', function(req, res) {
  getBoat(req.params.boat_id).then( (entity) => {
      if(entity[0] === undefined) {
        res.status(404).end();
      } else {
        console.log(entity);
        res.status(200).json(entity[0]).end();
      }
    });
});

// Edit single Boat
app.patch('/boats/:boat_id', function(req, res) {
  if(req.body.name === undefined || req.body.type === undefined || req.body.length === undefined) {
    res.status(400).send({error: "Missing parameters"}).end();
  } else {
      const boat = new Boat(req.body.name, req.body.type, req.body.length);
      updateBoat(req.params.boat_id, boat).then( key => {res.status(201).send('{ "id": ' + result[0].mutationResults[0].key.path[0].id + ' }').end()} );
  }
});

// Delete single Boat
app.delete('/boats/:boat_id', function(req, res) {
  deleteBoat(req.params.boat_id).then( () => {
      if(err) {
        console.log(err)
        res.status(404).end();
      } else {
        res.status(204).end();
      }
    });
});

// Get all Boats
app.get('/boats', function(req, res) {
  getAllBoats().then( (entities) => {
    res.status(200).json(entities).end();
  });
});

/* end Boat routes */


const PORT = process.env.PORT || 8080;
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_flex_datastore_app]

module.exports = app;
