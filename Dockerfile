FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install pnpm
RUN npm install -g pnpm

# Install the application dependencies
RUN pnpm install

RUN pnpm install uuid
RUN pnpm install express

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["pnpm", "run", "start:prod"]