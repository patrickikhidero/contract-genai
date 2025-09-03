# Docker Setup for Contractor Generator Gateway

This document explains how to run the Django backend using Docker.

**Note**: The Docker setup uses Python 3.8 to match your local development environment.

## Prerequisites

- Docker and Docker Compose installed on your system
- Environment variables configured

## Environment Variables

Create a `.env` file in the `contract-generator-gateway` directory with the following variables:

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=1

# API Keys
GEMINI_API_KEY=your-gemini-api-key-here
URL=your-api-url-here

# Database Settings (for Docker)
POSTGRES_DB=contractor_generator
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

## Running with Docker

### 1. Build and start the services

```bash
cd contract-generator-gateway
docker-compose up --build
```

### 2. Run migrations (if needed)

```bash
docker-compose exec web python manage.py migrate
```

### 3. Create a superuser (optional)

```bash
docker-compose exec web python manage.py createsuperuser
```

### 4. Access the application

- Django application: http://localhost:8000
- Django admin: http://localhost:8000/admin
- API documentation: http://localhost:8000/
- TODO: Add a welcome page to the root and move API documentation to /docs/

## Development Commands

### Stop the services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f web
```

### Run Django shell
```bash
docker-compose exec web python manage.py shell
```

### Run tests
```bash
docker-compose exec web python manage.py test
```

## Database

The application uses PostgreSQL when running in Docker. The database data is persisted in a Docker volume named `postgres_data`.

To reset the database:
```bash
docker-compose down -v
docker-compose up --build
```

## Local Development vs Docker

- **Local Development**: Uses SQLite database (no Docker required)
- **Docker**: Uses PostgreSQL database with full containerized environment

The settings automatically detect the environment and configure the appropriate database.
