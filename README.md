# AidConnect — Local Server

This is a minimal Node.js/Express server to serve the AidConnect frontend (`index.html`) and provide a couple of example API endpoints for requests and donations.

## Prerequisites
- Node.js 14+ installed
- Powershell (Windows) — commands below use PowerShell

## Install
Open PowerShell, change directory to the project folder (where `index.html` and `server.js` live), then run:

```powershell
cd "c:\Users\Asus\OneDrive\project\Donation\Main functoning appp"
npm install
```

## Run
Start the server:

```powershell
npm start
```

The server listens on http://localhost:3000 by default. Open that URL in your browser to see the frontend.

## Development
Use nodemon for auto-reload while editing:

```powershell
npm run dev
```

## Available API endpoints
- GET /api/requests — list available requests
- POST /api/donate — submit a donation (body: { requestId, donorName?, amount })
- GET /api/donations — list donations

## Notes & next steps
- This server uses in-memory data. For production, connect to a real database (MongoDB, Postgres, etc.).
- If the frontend expects AJAX calls, adapt client JS to call the endpoints above.
"# batch4-project-" 
