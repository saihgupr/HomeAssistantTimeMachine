FROM node:20-alpine

# Install git, curl and other dependencies
RUN apk add --no-cache git curl

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x run.sh

# Expose the port
EXPOSE 54000

# Set environment variables
ENV NODE_ENV=development

# Start the application
CMD ["/bin/sh", "run.sh"]