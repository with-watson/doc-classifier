# Document Classifier Service

It is a micro service which takes a PDF file as an input and return the type of the file. Currently it supports Form 10-K & Form 8-K file types. It first check the file name for the file type detection. If nothing matches then it analyze the first few words (1000 words) of the PDF file using Watson NLU to check the entity name 'FORM_TYPE' using Watson Knowledge Studio trained custom model id. If it find some value then it got return to the user as a text string (ex: File type detected as 'Form 10K') else it says 'Could not detect the file type'.



## Included components

> * [Watson Natural Language Understanding (NLU)](https://console.bluemix.net/catalog/services/natural-language-understanding): A IBM Cloud service that can analyze text to extract meta-data from content such as concepts, entities, keywords, categories, sentiment, emotion, relations, semantic roles, using natural language understanding.

> * [IBM Watson Knowledge Studio (WKS)](https://console.bluemix.net/catalog/services/knowledge-studio): Teach Watson the language of your domain with custom models that identify entities and relationships unique to your industry, in unstructured text. Build your models in a collaborative environment designed for both developers and domain experts, without needing to write code. Use the models in Watson Discovery, Watson Natural Language Understanding, and Watson Explorer.



## Github

https://github.com/with-watson/doc-classifier



## Local Run

* npm install
* npm start



## API

`POST -> /api/adc`


> HEADER:
* key: {string} secret key

> FORM DATA:
* file: PDF file only

> OUTPUT:
* File_Type: text value



## Config

Environment Variables:

* PORT: the port that the application will listen on. Default `3000`

* TDNS_SECRET: simple key for auth control. Default key = `topsecret`



## Demo

<img src="/readme-images/postman request.gif" width="100%"/>

