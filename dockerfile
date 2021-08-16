FROM node:alpine

ARG npm_package_name

RUN apk add --update git

# Create app directory
WORKDIR /opt/${npm_package_name}/

# Setup package
COPY package*.json ./

# Install app dependencies
RUN apk add --no-cache --virtual .gyp \
		python3 \
		make \
		g++ \
	&& npm install --production\
	&& apk del .gyp

# Bundle app source
COPY ./dist/ ./dist/

CMD [ "npm", "start" ]
