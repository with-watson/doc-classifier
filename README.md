
# Document Classifier Service

It is a micro service which takes a PDF file as an input and return the type of the file. Currently it supports Form 10-K & Form 8-K file types. It first check the file name for the file type detection. If nothing matches then it analyze the first few words (1000 words) of the PDF file using Watson NLU to check the entity name 'FORM_TYPE' using Watson Knowledge Studio trained custom model id. If it find some value then it got return to the user as a text string (ex: File type detected as 'Form 10K') else it says 'Could not detect the file type'.



## Included components

* [Watson Natural Language Understanding (NLU)](https://console.bluemix.net/catalog/services/natural-language-understanding): 
>A IBM Cloud service that can analyze text to extract meta-data from content such as concepts, entities, keywords, categories, sentiment, emotion, relations, semantic roles, using natural language understanding.

* [IBM Watson Knowledge Studio (WKS)](https://console.bluemix.net/catalog/services/knowledge-studio): 
>Teach Watson the language of your domain with custom models that identify entities and relationships unique to your industry, in unstructured text. Build your models in a collaborative environment designed for both developers and domain experts, without needing to write code. Use the models in Watson Discovery, Watson Natural Language Understanding, and Watson Explorer.



## Github

https://github.com/with-watson/doc-classifier



## Local Run

* npm install
* npm start



## API
> URL: dc-micro-service.withwatson-std-cluster.us-south.containers.mybluemix.net
`POST -> /api/adc`


- HEADER:
	- key: {string} secret key

- FORM DATA:
	- file: PDF file only

- OUTPUT:
	- File_Type: text value



## Config

Environment Variables:

* PORT: the port that the application will listen on. Default `3000`

* TDNS_SECRET: simple key for auth control. Default key = `topsecret`


## Docker Image Push

- IBM Cloud plugin & Namespaces
	- bx plugin list | List IBM Cloud installed plugin.
	- bx plugin update container-service | Update IBM Cloud plugin update.
	- bx login --sso | Log in to IBM Cloud

- IBM Cloud Namespaces	
	- bx cr namespace-list | Namespaces list
	- bx cr namespace-rm dc-micro-service | Delete namespace named dc-micro-service
	- bx cr namespace-add dc-micro-service

- IBM Cloud clusters
	- bx cs clusters | List clusters.
	- bx cs cluster-config withwatson-std-cluster | configuration for withwatson-std-cluster is downloaded
	- export KUBECONFIG=/Users/abhi/.bluemix/plugins/container-service/clusters/withwatson-std-cluster/kube-config-dal13-withwatson-std-cluster.yml

- Mini Cube Configure: 
	- curl -Lo minikube https://storage.googleapis.com/minikube/releases/v0.27.0/minikube-darwin-amd64 && chmod +x minikube && sudo mv minikube /usr/local/bin/    |  Install minicube on local machine
	- minikube start
	- minikube status
	- minikube stop
	- minikube delete

- kubectl apply:
	- Goto doc-classifier/kubernetes folder and run following commands after modifying all the three files:
	- brew install kubectl
	- kubectl apply -f deployment.yaml
	- kubectl apply -f port-service.yaml
	- kubectl apply -f ingress.yaml

- Build docker image:
	- docker images  | List of existing images.
	- docker rmi -f image_id | Remove an image with a numerical id 'image_id'.
	- docker pull node:10 | Pull the node version 10 image from docker hub.
	- docker build -t dc-micro-service .   | Build local image
	- docker build -t registry.ng.bluemix.net/dc-micro-service/dc-micro-service:2018-05-23.0 .  | Build  image in IBM Cloud

- Push docker image:
	- docker push registry.ng.bluemix.net/dc-micro-service/dc-micro-service:2018-05-23.0  | Push image
	- bx cr image-list | Images list 
	- The url is: http://dc-micro-service.withwatson-std-cluster.us-south.containers.mybluemix.net
	- bx cr image-rm registry.ng.bluemix.net/dc-micro-service/dc-micro-service:2018-05-23.0 | Delete one or more images from IBM Cloud Container Registry.




## Demo

http://dc-micro-service.withwatson-std-cluster.us-south.containers.mybluemix.net/api/adc

<img src="/readme-images/postman request.gif" width="100%"/>

