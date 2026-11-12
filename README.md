# Text Dashboard

FastAPI + MongoDB Atlas (free M0) backend, React (Vite) dashboard.

## 1. Free MongoDB (Atlas)
1. Sign up at https://www.mongodb.com/cloud/atlas/register → create a free **M0** cluster.
2. Database Access → add a user (username + password).
3. Network Access → add IP `0.0.0.0/0` (needed for a deployed API; fine for a demo).
4. Connect → Drivers → copy the `mongodb+srv://...` string.

## 2. Backend
```
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then paste MONGODB_URI (and optionally API_KEY)
uvicorn main:app --reload
```
Docs: http://localhost:8000/docs

## 3. Frontend
```
cd frontend
npm install
copy .env.example .env      # VITE_API_URL = your API url
npm run dev
```
Dashboard: http://localhost:5173 (auto-refreshes every 5s).

## 4. Sending data (what you give to others)
```
# JSON
curl -X POST http://localhost:8000/api/entries -H "Content-Type: application/json" \
     -d '{"text":"hello world","sender":"alice"}'

# Raw text
curl -X POST "http://localhost:8000/api/text?sender=bob" -H "Content-Type: text/plain" -d "plain text here"
```
If you set `API_KEY` in `.env`, add `-H "X-API-Key: <key>"`. Reading (dashboard) stays open.

## Deploying
Backend: Render/Railway/Fly (start: `uvicorn main:app --host 0.0.0.0 --port $PORT`, set env vars).
Frontend: Vercel/Netlify with `VITE_API_URL` set to the deployed API. Set `CORS_ORIGINS` to the frontend URL.
