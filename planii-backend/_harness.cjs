const { newDb } = require('pg-mem');
const db = newDb();
const pg = db.adapters.createPg();
const Module = require('module');
const orig = Module._load;
Module._load = function(request, ...a){ if(request==='pg') return pg; return orig.call(this, request, ...a); };
process.env.PORT='4100'; process.env.JWT_SECRET='test'; process.env.APP_URL='http://localhost:4100'; process.env.DATABASE_URL='postgres://mem';
require('./server.js');
