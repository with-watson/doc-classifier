const express = require('express')
const morgan = require('morgan')
const upload = require('multer')({dest: 'tmp/'})
const cp = require('child_process')
const mimetype = require('mime-types')
const helmet = require('helmet')
const fs = require('fs')
const glob = require('glob-all')
const util = require('util')
const zpad = require('zpad')
const path = require('path')
const rimrafPromise = require('./util/rimrafPromise')
const extract = require('pdf-text-extract')

// build app
const app = express()

// promisify functions
const execPromise = util.promisify(cp.exec)
const mkdirPromise = util.promisify(fs.mkdir)
const renamePromise = util.promisify(fs.rename)

require('dotenv').config({ silent: true });

const port = process.env.PORT || 3000

// helmet protection
app.use(helmet())

// use morgan to log requests to the console
app.use(morgan('dev'))

const apiRoutes = express.Router()

// default values
const language = 'eng'
const psm = 6
const output = 'text'

const acceptableMIMETypes = [
  'image/png',
  'image/jpeg',
  'application/pdf'
]

const acceptableOutputTypes = [
  'pdf',
  'text'
]

// Cheap temporary auth ... this is NOT secure
const secret = process.env.TDNS_SECRET || 'topsecret';



// NLU Instance
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': process.env.NLU_USERNAME,
  'password': process.env.NLU_PASSWORD,
  'version': '2018-03-16'
});
var paramsNLU = {
  'text': 'IBM is an American multinational technology company headquartered in Armonk, New York, United States, with operations in over 170 countries.',
  
  'features': {
    'entities': {
      'model': process.env.WKS_MODEL_ID
  }}
};



// Discovery Instance
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const discovery = new DiscoveryV1({
    username: process.env.DISCOVERY_USERNAME,
    password: process.env.DISCOVERY_PASSWORD,
    version: '2018-03-05'
});
var paramsDiscovery = { 
    environment_id: process.env.ENVIRONMENT_ID, 
    collection_id: process.env.COLLECTION_ID, 
    query: '10k'
};


// Disable/Enable Javascript log
console.log = function() {}


// Reading entity-type.properties local file, contains entity key & entity list.
const eTypeFilename = process.env.ENTITY_TYPE_FILE_NAME + '.properties';
var eTypeList = [];
fs.readFile( eTypeFilename, 'utf8', function(err, data) {
  if (err) {
    console.error('ERROR: Property file not found, file name: ' + eTypeFilename);
    return;
  }
  var lines = data.split(/\r?\n/);

  lines.forEach( function(l) {
    eTypeList.push(JSON.parse(l));
  });
});



// Reading entity-type.properties local file, contains entity key & entity name.
const eNameFilename = process.env.ENTITY_NAME_FILE_NAME + '.properties';
var eNameList = [];
fs.readFile( eNameFilename, 'utf8', function(err, data) {
  if (err) {
    console.error('ERROR: Property file not found, file name: ' + eNameFilename);
    return;
  }
  var lines = data.split(/\r?\n/);

  lines.forEach( function(l) {
    eNameList.push(JSON.parse(l));
  });
});



// Get the entity key and the corresponding value.
var entityKey = '';
var entityName = '';
function getEntity (uniqueEntityTypeList) {

  eTypeList.forEach( function(e, i) {

    var eSet = e[ 'entity_' + (i+1) ];
    eSet.forEach( function(e) {
      uniqueEntityTypeList.forEach( function(u) {
        if( e.toLowerCase() == u.toLowerCase() ) {
          entityKey = 'entity_' + (i+1);
          return;
        }      
      });
    });

  });

  eNameList.forEach( function(e) {
    if (e[entityKey] != undefined) {
      entityName = e[entityKey];
      return;
    }
  });
}



app.use((req, res, next) => {
  if (req.header('key') !== secret) {
    res.status(401).send('unauthorized')
  } else {
    next()
  }
})


apiRoutes.post('/adc', upload.single('file'), async (req, res, next) => {
  
  // Basic Validation: Verify a file was included
  if (!req.file) {
    next({
      message: 'no file found in file field'
    })
    return
  // verify it is an acceptable MIME type
  } else if (!acceptableMIMETypes.includes(req.file.mimetype)) {
    next({
      message: `${req.file.mimetype} is not a valid MIME type.`,
      validMIMETypes: acceptableMIMETypes
    })
    return
  // verify that output requested is appropriate
  } else if
  (
    req.body.output &&
    !acceptableOutputTypes.includes(req.body.output)
  ) {
    next({
      message: `${req.body.output} is not a valid output type.`,
      validOutputTypes: acceptableOutputTypes
    })
    return
  // 20 mb limit
  } else if (req.file.size > (20 * 1000 * 1000)) {
    next({
      message: 'file exceeds limit of 20mb'
    })
    return
  }


  // Set config values for executables
  const outputType = req.body.output || output
  let outputParam = ''
  if (outputType !== 'text') {
    outputParam = outputType
  }
  // Map of output types to extension
  const extMap = {
    text: 'txt',
    pdf: 'pdf'
  }


  // Create a tmp dir, set our base file
  const tmpDir = `tmp/_${req.file.filename}`
  const outbase = `${tmpDir}/${req.file.filename}`

  req.tmpDir = tmpDir

  // Make a directory for this file and move the original
  try {
    await mkdirPromise(tmpDir)
    await renamePromise(req.file.path, outbase)
  } catch (err) {
    next({
      message: 'server error'
    })
    return
  }


  if (req.file.mimetype === 'application/pdf') {

    //Rule [1]: Check entity in the file name.
    var fileName = req.file.originalname;
    var nameList = fileName.replace('.pdf', '').split(' ');
    console.log(nameList);
    //res.status(200).send(nameList);
    

    //Rule [2]: Reading First two pages of the PDF file & find entity using Discovery
    extract(outbase, { firstPage: 2, lastPage: 4, splitPages: false }, function (err, text) {
      if (err) {
        console.dir(err)
        res.json('error:', err);
        return;
      }

      
      entityKey = '';
      entityName = '';
      
      // Java-script Text Manipulation
      text = text.toString().replace(/ +(?= )/g,'');    // Replace multiple spaces with a single space.
      text = text.toString().replace(/\n/g,"");         // Remove all /n.
      text = text.split(' ').slice(0, 200).join(' ');   // Take only initial 100 words.
      
      paramsNLU.text = text;
      console.log('paramsNLU = ' + JSON.stringify(paramsNLU));

      
      // Call Watson NLU Service
      natural_language_understanding.analyze(paramsNLU, function(err, response) {
        
        if (err) {
          console.log('error:', err);
          res.json('error:', err);
        } else
          var entityTypeList = [];
          response.entities.forEach( function( e ) {
              entityTypeList.push(e.type);
          });

          // Javascript function to remove duplicate entries.
          var uniqueEntityTypeList = entityTypeList.filter(function(item, pos) {
              return entityTypeList.indexOf(item) == pos;
          })

          getEntity (uniqueEntityTypeList);
          console.log('uniqueEntityTypeList = ' + uniqueEntityTypeList);
          
          if(entityName != '')
            res.json ("File type detected as '" + entityName + "'");
          else 
            res.json ('Could not detect the file type.');
      });


      // Call Watson Discovery Service
      /*paramsDiscovery.query = encodeURI(text);
      console.dir(paramsDiscovery.query);
      discovery.query(paramsDiscovery, (error, response) => {
        if (error) {
          next(error);
        } else {
          res.json(response);
          //Get Entities: response[i].enriched_text.entities[i]
        }
      });*/

    });

  } else {
    console.dir('Non PDF file is not supported.');
    res.status(200).send('Non PDF file is not supported.');
  }

})

// anything not matching our path will immediately return a 404
apiRoutes.use('*', (req,res, next) => {
  if (!res.headersSent) {
    res.status(404).send('resource not found')
  } else {
    next()
  }
})

app.use('/api', apiRoutes)

// cleanup
app.use((req, res, next) => {
  if (req.tmpDir) {
    rimrafPromise(req.tmpDir)
  }
  next()
})

// error handling
app.use((err, req, res, next) => {
  if (!res.headersSent) {
    if (err) {
      res.status(500).send(err)
    }
    else {
      res.status(404).send()
    }
  }
})

app.listen(port)
console.log(`Listening on port ${port}`)
