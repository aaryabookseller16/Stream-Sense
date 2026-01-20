

# Use a small, stable Node image
FROM node:20-alpine

# Create app directory inside the container
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

# Expose the API port (matches docker-compose mapping)
EXPOSE 8000

# Start the server
CMD ["npm", "start"]