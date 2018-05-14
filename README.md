# Document Classifier Service

A node application to take scanned PDFs or images (png, jpg) and convert to text or searchable PDF
```
    Header Parameters:
    {key: KEYVALUE}
    {output: text | PDF}
                      |                   +-----------------------+
                      |                   |                       |
                      +-----------------> |                       |
                                          |                       |
Supported Input Formats: ------IN-------> |   OCR Microservice    +----OUT---->Supported Output Formats:
PDF (or) PNG (or) JPG                     |                       |            Electronic text (or) PDF
                      +-----------------> |                       |
                      |                   |                       |
                      |                   +-----------------------+
                      +
    Languages: Agnostic

```
## Install
TODO

## API

`POST -> /api/adc`

HEADER:

key: {string} secret key

FORM DATA:

output: 'text' | 'pdf'

file: pdf file | png file | jpg file

## Config

Environment Variables

PORT: the port that the application will listen on. Default `3000`

TDNS_SECRET: simple key for auth control. Default `topsecret`

## Next Steps

Robust auth control. Design for proxy or gateway access.
Additional image types
Specify PSM optionally
Specify language optionally
Test cases
