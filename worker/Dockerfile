# ---- build/runtime image ----
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install deps first (better Docker cache)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy source
COPY src ./src

# Run the worker
CMD ["node", "src/index.js"]