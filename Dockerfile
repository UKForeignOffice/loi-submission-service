FROM node:18-alpine3.18 AS build
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine3.18 AS run
WORKDIR /opt/app
COPY --from=build /opt/app ./
COPY . ./
EXPOSE 3005
CMD ["node", "server/bin/www", "3005"]
