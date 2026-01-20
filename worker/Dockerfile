# ---- build/runtime image ----
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install deps first (better Docker cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Run the worker
CMD ["node", "src/index.js"]