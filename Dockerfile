# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm ci

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npx prisma generate

# Creates a "dist" folder with the production build
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD [ "node", "dist/server.js" ]
