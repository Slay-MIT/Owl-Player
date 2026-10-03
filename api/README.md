# Owl-Player API

Backend API for the video streaming platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start API server
npm run dev
```

## 📁 Structure

```
api/
├── controllers/      # Route handlers
├── middleware/       # Auth, validation
├── routes/          # API routes
├── workers/         # Background jobs
├── uploads/         # Temporary file storage
└── server.js        # Express app entry point
```

## 🔧 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run worker` - Start video processing worker
- `npm test` - Run tests

## 📝 API Documentation

See the main README.md for complete API documentation.
