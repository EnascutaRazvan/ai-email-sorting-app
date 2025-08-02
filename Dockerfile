# Use the official Playwright base image
FROM mcr.microsoft.com/playwright:v1.54.2-jammy

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install

# Expose port (for debugging or local dev)
EXPOSE 3000

# Run your app (adjust for Next.js or other framework)
CMD ["npm", "run", "start"]
