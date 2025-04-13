# BCS Platform Backend

FastAPI backend for the BCS Platform video processing application.

## Features

- Video transcoding to different formats
- Watermark addition to videos
- Job history tracking
- MongoDB integration
- RESTful API endpoints

## Development Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Run the development server:
```bash
uvicorn app.main:app --reload
```

## Docker Deployment

### Prerequisites

- Docker
- Docker Compose

### Building and Running

1. Build and start the containers:
```bash
docker-compose up --build
```

2. To run in detached mode:
```bash
docker-compose up -d
```

3. To stop the containers:
```bash
docker-compose down
```

4. To view logs:
```bash
docker-compose logs -f
```

### Environment Variables

The following environment variables can be set in the `docker-compose.yml` file:

- `MONGODB_URL`: MongoDB connection string
- `DB_NAME`: Database name
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Volumes

- `./uploads`: Directory for uploaded files
- `./logs`: Directory for application logs
- `mongodb_data`: Persistent MongoDB data

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT 