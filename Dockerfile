# latest official node image
FROM node:9

RUN apt-get update -y
RUN apt-get install -y apt-utils tesseract-ocr poppler-utils

# add project files
WORKDIR /app
ADD . /app

# add project files
WORKDIR /app
ADD . /app

RUN npm install --production

EXPOSE 3000

CMD ["npm", "start"]
