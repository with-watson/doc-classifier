# latest official node image
FROM node:9

RUN apt-get update -y

# add project files
WORKDIR /app
ADD . /app

# add project files
WORKDIR /app
ADD . /app

RUN npm install --production

EXPOSE 3000

CMD ["npm", "start"]
