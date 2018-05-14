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

// cheap temporary auth ... this is NOT secure
const secret = process.env.TDNS_SECRET || 'topsecret';

// NLU Instance
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': 'f42be6ef-cc87-4525-8bb3-04b9048cf8a4',
  'password': 'iHzab2ROlxA7',
  'version': '2018-03-16'
});
var paramsNLU = {
  'text': 'IBM is an American multinational technology company headquartered in Armonk, New York, United States, with operations in over 170 countries.',
  'features': {
    'entities': {
      'emotion': true,
      'sentiment': true,
      'limit': 2
    },
    'keywords': {
      'emotion': true,
      'sentiment': true,
      'limit': 2
    }
  }
}



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
      message: 'no image found in file field'
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
    //console.log(nameList);
    //res.status(200).send(nameList);
    

    //Rule [2]: Reading First two pages of the PDF file & find entity using Discovery
    extract(outbase, { firstPage: 2, lastPage: 4, splitPages: false }, function (err, text) {
      if (err) {
        console.dir(err)
        return
      }
      
      text = text.toString().replace(/ +(?= )/g,'');  // Replace multiple spaces with a single space.
      text = text.toString().replace(/\n/g,"");       // Remove all /n.
      text = text.split(' ').slice(0, 500).join(' ');  // Take only initial 100 words.
      console.log(text);


      // Call NLU
      paramsNLU.text = encodeURI(text);
      natural_language_understanding.analyze(paramsNLU, function(err, response) {
        if (err) {
          console.log('error:', err);
          res.json('error:', err);
        } else
          res.json(JSON.stringify(response, null, 2));
      });


      // Call Discovery
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


    //Rule [4]: Identify entity using rulebase.



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
