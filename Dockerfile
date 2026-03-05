FROM node:20-alpine

# Install postgresql-client for native dev pg_dump functionality
RUN apk add --no-cache postgresql-client libc6-compat

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run the development server
CMD ["npm", "run", "dev"]
