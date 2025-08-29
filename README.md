# Contract Generator AI

A full-stack application for generating contracts using AI. The project consists of a Next.js frontend and a Django backend API.

## Project Structure

```
contractor-generator/
├── contract-genai/          # Next.js frontend
└── contract-generator-gateway/  # Django backend
```

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- npm or yarn
- pip

## Frontend Setup (contract-genai)

### Installation

1. Navigate to the frontend directory:
```bash
cd contract-genai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

### Running the Frontend

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The frontend will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run start
```

## Backend Setup (contract-generator-gateway)

### Installation

1. Navigate to the backend directory:
```bash
cd contract-generator-gateway
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Database Setup

Apply database migrations:
```bash
python manage.py migrate
```

### Running the Backend

Start the Django development server:
```bash
python manage.py runserver
```

The backend API will be available at `http://localhost:8000`

### API Endpoints

- `GET /api/contracts/stream/` - Stream contract generation with prompt parameter

## Testing

### Frontend Tests

Run frontend tests from the `contract-genai` directory:
```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Backend Tests

Run backend tests from the `contract-generator-gateway` directory:
```bash
python manage.py test
```

## Environment Variables

### Backend (.env file in contract-generator-gateway/)
Create a `.env` file with the following variables if needed:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
```

### Frontend
The frontend may require environment variables for API endpoints. Check `src/utils/api.ts` for configuration.

## Development

### Frontend Development
- Main application: `src/app/page.tsx`
- Components: `src/components/`
- API utilities: `src/utils/api.ts`

### Backend Development
- Django app: `contracts/`
- Views: `contracts/views.py`
- Models: `contracts/models.py`
- Tests: `contracts/tests.py`

## Deployment

### Frontend Deployment
The frontend can be deployed to Vercel, Netlify, or any platform supporting Next.js.

### Backend Deployment
The backend can be deployed to platforms supporting Django applications like Heroku, Railway, or a VPS.

## Troubleshooting

- If you encounter CORS issues, ensure the backend is running and accessible
- Check that all dependencies are installed correctly
- Verify database migrations are applied
