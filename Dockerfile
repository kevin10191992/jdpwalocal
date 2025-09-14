# Use the official Node.js 16 image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose port 4000 to the host
EXPOSE 4000

# Start the application
CMD [ "npm", "start" ]
