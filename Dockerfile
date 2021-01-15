
# The instructions for the first stage
FROM node:14.15.3-alpine as builder

# set to production to run build
#ARG NODE_ENV=development

# set working directory
WORKDIR /app

# install app dependencies
# package.json is copied over before source so that docker can appropriately use cache
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent

# This would be a problem if node_modules wasn't docker ignored
COPY . ./

# This would ordinarilly be run with npm install
# However we don't copy over the schema file so it can't run this
# We could copy this ahead of time with `COPY prisma ./` alongside the package.json but that would mess with cache
RUN npx prisma generate

# Builds and creates the package, does not create an archive
RUN REDERLY_PACKAGER_ARCHIVE=false npm run build:package

# The instructions for second stage
FROM node:14.15.3-alpine

#WORKDIR /app
COPY --from=builder /app/build ./rederly
COPY --from=builder /app/.env ./rederly/

WORKDIR /rederly
CMD npm run run:build
