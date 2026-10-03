# 🚀 Deployment Guide

This guide covers deploying Owl-Player to production environments.

## Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Cloud Providers](#cloud-providers)
3. [Environment Variables](#environment-variables)
4. [Security Checklist](#security-checklist)
5. [Troubleshooting](#troubleshooting)

---

## Docker Deployment

### Build and Run Locally

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up volumes (WARNING: deletes all data)
docker-compose down -v
```

### Production Build

```bash
# Build for production
docker-compose --build-args NODE_ENV=production build

# Run with production settings
docker-compose up -d
```

### Port Configuration

Edit `docker-compose.yml` to change ports:

```yaml
services:
  api:
    ports:
      - "${API_PORT:-3001}:3001"
  
  frontend:
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
```

---

## Cloud Providers

### AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Docker
curl -fsSL https://get.docker.com | bash -s docker

# Clone and deploy
git clone <repository-url>
cd Owl-Player
docker-compose up -d

# Setup firewall
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # API
sudo ufw allow 9000/tcp  # MinIO S3
sudo ufw allow 9001/tcp  # MinIO Console
```

### AWS ECS (Elastic Container Service)

1. Create ECR repository for Docker images
2. Push images to ECR
3. Create ECS task definition
4. Configure ECS service with Fargate or EC2 launch type
5. Set up Application Load Balancer with HTTPS

### Google Cloud Platform (GCP)

```bash
# Install gcloud and Docker
gcloud components install docker

# Authenticate
gcloud auth login

# Create GKE cluster
gcloud container clusters create owl-player-cluster

# Deploy to GKE
kubectl apply -f k8s-deployment.yaml
```

### DigitalOcean

```bash
# One-click app or manual setup
# Use Droplet with Docker installed
doctl compute droplet create owl-player \
  --image ubuntu-22-04 \
  --size generic-s-1vcpu-1gb \
  --region nyc3
```

---

## Environment Variables

### Production Settings

Create `.env.production`:

```env
# API Server
API_PORT=3001
PORT=3001

# Database (use strong passwords!)
POSTGRES_USER=owlplayer
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=videos

# MinIO (use strong credentials!)
MINIO_ACCESS_KEY=<random-access-key>
MINIO_SECRET_KEY=<random-secret-key>

# JWT (use a secure random string!)
JWT_SECRET=<64-character-random-string>
JWT_EXPIRES_IN=24h

# CORS (restrict to your domains)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# RabbitMQ (use strong credentials!)
RABBITMQ_USER=owlplayer
RABBITMQ_PASSWORD=<strong-random-password>
```

### Environment-Specific Configs

Create separate env files:

- `.env` - Local development
- `.env.production` - Production
- `.env.staging` - Staging environment

---

## Security Checklist

- [ ] Change all default passwords (MinIO, RabbitMQ, PostgreSQL)
- [ ] Use strong JWT secrets (64+ characters, random)
- [ ] Restrict CORS origins to production domains
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure firewall rules (only necessary ports open)
- [ ] Set up regular database backups
- [ ] Enable MinIO encryption at rest
- [ ] Configure RabbitMQ TLS
- [ ] Set up intrusion detection
- [ ] Review and update dependencies regularly

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs <service-name>

# Rebuild services
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready

# Reset database (WARNING: deletes data!)
docker-compose down -v
docker-compose up -d
```

### MinIO Not Accessible

```bash
# Check MinIO console
curl http://localhost:9001

# Verify bucket exists
mc alias set myminio http://localhost:9000 admin:minioadmin
mc ls myminio
```

### Frontend 404 Errors

Ensure `frontend/server.js` exists in the Docker context. The Next.js standalone build requires this file to serve pages correctly.

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3001/api/health

# Frontend health (via API)
curl http://localhost:3001/api/health
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f api
docker-compose logs -f frontend
```

---

## Scaling

### Horizontal Scaling

For production, consider:

1. **API**: Multiple instances behind a load balancer
2. **Worker**: Scale based on queue depth
3. **Database**: Use read replicas
4. **MinIO**: Multi-node cluster for redundancy

### RabbitMQ Clustering

```bash
# Configure RabbitMQ clustering in docker-compose.yml
rabbitmq:
  command: >
    rabbitmq-server \
    -detached \
    -config /etc/rabbitmq/cluster.conf
```

---

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, GitLab CI)
2. Configure automated backups
3. Set up monitoring (Prometheus, Grafana)
4. Implement logging aggregation (ELK Stack, Loki)
5. Configure alerting for critical errors

---

**Need help?** Open an issue in the repository!
