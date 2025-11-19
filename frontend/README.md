# Mental Health Therapy - Frontend

React frontend for the Mental Health Audio Therapy application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Features

- User authentication (Login/Register)
- Patient dashboard for creating and viewing therapy sessions
- Psychologist dashboard for reviewing and approving sessions
- Audio playback for generated therapy content
- Responsive design with modern UI

## Configuration

The frontend is configured to proxy API requests to `http://localhost:8000` (backend server). This is configured in `vite.config.js`.

If your backend runs on a different port, update the proxy configuration in `vite.config.js`.

