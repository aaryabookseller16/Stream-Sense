# StreamSense Reactor - Worker
# This container runs continuously and consumes streaming events from Kafka

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first (better Docker layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy worker source code
COPY src ./src

# Start the worker process
CMD ["npm", "start"]
