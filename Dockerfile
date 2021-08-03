FROM node:12-alpine3.12 AS build
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci --only=production

FROM node:12-alpine3.12 AS run
WORKDIR /opt/app
COPY --from=build /opt/app ./
COPY . ./
EXPOSE 3005
CMD ["node", "server/bin/www", "3005"]
