# Document Classifier Service

A node application to take PDFs file and return the type of file.

## Install
TODO

## API

`POST -> /api/adc`

HEADER:

key: {string} secret key

FORM DATA:

file: pdf file

output: 'text'



## Config

Environment Variables

PORT: the port that the application will listen on. Default `3000`

TDNS_SECRET: simple key for auth control. Default `topsecret`

