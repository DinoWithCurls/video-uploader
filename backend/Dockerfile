FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads/videos

# Expose port
EXPOSE 3001

# Start command
CMD [ "npm", "start" ]
