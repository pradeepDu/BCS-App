# BCS Platform

A video processing platform that allows users to transcode videos and add watermarks.

## Features

- Video transcoding to different formats
- Watermark addition to videos
- Job history tracking
- User authentication
- Real-time processing status updates

## Project Structure

```
.
├── backend/             # FastAPI backend
│   ├── app/            # Application code
│   ├── uploads/        # Uploaded files directory
│   └── requirements.txt
└── bcs-app/            # React frontend
    ├── src/            # Source code
    └── dist/           # Production build
```

## Deployment Guide

### Frontend Deployment

1. Build the frontend:
```bash
cd bcs-app
npm install
npm run build
```

2. The built files will be in the `dist` directory, which can be deployed to any static hosting service like Netlify, Vercel, or AWS S3.

### Backend Deployment

1. Set up environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your production values
```

3. Required environment variables:
- `MONGODB_URL`: Your MongoDB connection string
- `DB_NAME`: Database name
- `SECRET_KEY`: A secure secret key for JWT
- `CORS_ORIGINS`: Comma-separated list of allowed origins

4. Start the server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Production Considerations

1. Use a process manager like PM2 or Supervisor
2. Set up NGINX as a reverse proxy
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up proper MongoDB authentication
6. Configure proper file upload limits
7. Set up monitoring and logging

## Development

1. Start the backend:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the frontend:
```bash
cd bcs-app
npm run dev
```

## Requirements

- Node.js 16+
- Python 3.8+
- FFmpeg
- MongoDB

## License

MIT 