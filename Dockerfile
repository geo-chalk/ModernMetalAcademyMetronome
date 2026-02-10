FROM node:20-slim
WORKDIR /app
# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install
# Copy the rest of the files
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]