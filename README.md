# 🦉 Owl-Player - Video Streaming Platform

A full-stack video streaming platform built with **Next.js**, **Express**, **PostgreSQL**, **MinIO**, and **RabbitMQ**. Perfect for showcasing FAANG-level skills in your resume!

![Status](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)

## 🌟 Features

- **Video Upload & Processing**: Upload videos and automatically transcode to multiple qualities (1080p, 720p, 480p, 360p)
- **Adaptive Bitrate Streaming**: HLS/DASH streaming with quality switching
- **Authentication System**: JWT-based auth with refresh tokens
- **Responsive UI**: Modern dark theme with Tailwind CSS
- **Message Queue**: RabbitMQ for async video processing
- **Object Storage**: MinIO (S3-compatible) for video storage
- **Database**: PostgreSQL with comprehensive schema
- **Health Monitoring**: Built-in health check endpoints

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│    API      │◀───▶│   RabbitMQ   │
│  (Next.js)  │     │  (Express)  │     │              │
└─────────────┘     └─────────────┘     └─────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   PostgreSQL      │
                    │   (Metadata DB)   │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     MinIO         │
                    │  (Object Storage) │
                    └───────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (optional, for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Owl-Player
   ```

2. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit with your values (optional for local dev)
   nano .env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the applications**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - MinIO Console: http://localhost:9001 (admin/minioadmin)
   - RabbitMQ Management: http://localhost:15672 (guest/guest)
   - PostgreSQL: localhost:5432

### Local Development

```bash
# Start API server
cd api
npm install
cp .env.example .env  # or use existing .env
npm run dev

# Start worker in separate terminal
npm run worker

# Start frontend
cd ../frontend
npm install
npm run dev
```

## 📁 Project Structure

```
Owl-Player/
├── api/                    # Backend API
│   ├── controllers/        # Route handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── videoController.js
│   ├── middleware/         # Auth, validation
│   │   └── auth.js
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── videos.js
│   ├── workers/            # Background jobs
│   │   └── videoProcessor.js
│   ├── uploads/            # Temporary uploads
│   ├── utils/              # Helper functions
│   ├── Dockerfile          # API container
│   ├── Dockerfile.worker   # Worker container
│   ├── server.js           # Express server entry
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── pages/              # React pages
│   │   ├── _app.js        # App wrapper
│   │   ├── index.js       # Home page
│   │   ├── upload.js      # Upload page
│   │   └── watch/         # Video player pages
│   ├── styles/             # CSS files
│   ├── .env.local          # Environment variables
│   ├── next.config.js      # Next.js config
│   ├── tailwind.config.js  # Tailwind config
│   ├── server.js           # Next.js standalone entry
│   └── package.json
├── schema.sql              # Database schema
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── DEPLOYMENT.md           # Deployment guide
└── Makefile                # Common commands
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Videos
- `GET /api/videos` - List all videos (paginated)
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/stream` - Get streaming URL
- `POST /api/videos/upload` - Upload new video
- `PUT /api/videos/:id` - Update video metadata
- `DELETE /api/videos/:id` - Delete video

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **MinIO** - Object storage (S3-compatible)
- **RabbitMQ** - Message queue for async processing
- **JWT** - Authentication tokens
- **AWS SDK** - S3 client for MinIO

### Frontend
- **Next.js 14** - React framework
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS
- **HLS.js** - HLS video player

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Orchestration

## 📊 Database Schema

The PostgreSQL database includes:
- `users` - User accounts and authentication
- `videos` - Video metadata and status
- `video_processing` - Processing history
- `video_stats` - Analytics tracking
- `comments` - User comments
- `likes` - Like functionality

## 🔧 Configuration

### Environment Variables

Create `.env` file in the root directory:

```env
# API Server Configuration
API_PORT=3001
PORT=3001

# Database Configuration
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev
POSTGRES_DB=videos

# MinIO Object Storage (S3-compatible)
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001

# RabbitMQ Message Queue
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Frontend Configuration
FRONTEND_PORT=3000
```

### Docker Compose Ports

| Service    | Port  | Description                    |
|------------|-------|--------------------------------|
| frontend   | 3000  | Next.js application            |
| api        | 3001  | Express API server             |
| minio      | 9000  | MinIO S3 API                   |
| minio      | 9001  | MinIO Console UI               |
| postgres   | 5432  | PostgreSQL database            |
| rabbitmq   | 5672  | RabbitMQ AMQP protocol         |
| rabbitmq   | 15672 | RabbitMQ Management UI         |

## 🎯 Key Features for Your Resume

This project demonstrates:

1. **Full-Stack Development**: Both frontend and backend expertise
2. **Microservices Architecture**: Separation of concerns with Docker
3. **Message Queues**: Async processing with RabbitMQ
4. **Cloud Storage**: S3-compatible object storage
5. **Authentication/Authorization**: JWT-based security
6. **Video Processing**: FFmpeg integration for transcoding
7. **Responsive Design**: Modern UI with Tailwind CSS
8. **Database Design**: Normalized schema with proper indexing
9. **Error Handling**: Comprehensive error handling and logging
10. **Production Ready**: Docker containers, health checks

## 📝 License

MIT License - Feel free to use this project in your portfolio!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue in the repository.

---

**Built with ❤️ for FAANG job seekers**
