# Use the official Node.js 18 Alpine image as base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or pnpm-lock.yaml)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm add -g pm2

# Copy the rest of the application code
COPY . .

# Build the application (if you have a build step)
# RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Set environment variables with defaults
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

# Start the application using PM2 for production
CMD ["pm2-runtime", "start", "server.js", "--name", "jdownloader-remote"]

# Alternative: Start directly with Node (without PM2)
# CMD ["node", "server.js"]
