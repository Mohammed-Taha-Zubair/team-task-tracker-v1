# Team Task Tracker

A full-stack Team Task Tracker built with a Django + MongoDB backend and Next.js frontend.

---

## Tech Stack

- **Backend**: Django, Django REST Framework (DRF), MongoDB via `mongoengine`, custom JWT auth (`PyJWT`).
- **Frontend**: Next.js (App Router), TailwindCSS, JavaScript (Client-side only, no TypeScript, no server actions).
- **Database**: MongoDB (no Django ORM used for application data).

---

## Project Structure

```text
TEAM-TASK-Manager/
├── backend/
│   ├── .env.example            # Environment variables template
│   ├── .env                    # Local environment variables (not committed)
│   ├── requirements.txt        # Backend Python dependencies
│   ├── manage.py               # Django management script
│   ├── api.http                # Sample REST API requests for manual testing
│   ├── config/
│   │   ├── settings.py         # Stripped Django settings (MongoDB, JWT, CORS)
│   │   └── urls.py             # Top-level API routing (/api/)
│   └── api/
│       ├── models.py           # MongoEngine documents (User, Team, Task, Comment, Activity)
│       ├── auth.py             # JWTAuth authentication & IsAdmin permissions
│       ├── utils.py            # log_activity and get_team_or_error helpers
│       ├── exceptions.py       # Custom error formatter ({"message": "..."})
│       ├── views_auth.py       # Auth endpoints (Register, Login, Refresh, Me)
│       ├── views_teams.py      # Teams endpoints (Create, List, Detail, Invite)
│       ├── views_tasks.py      # Tasks, Comments, and Activity endpoints
│       └── urls.py             # API URL routes
├── frontend/
│   ├── .env.local.example      # Frontend environment variables template
│   ├── .env.local              # Local Next.js config (NEXT_PUBLIC_API_URL)
│   ├── package.json
│   ├── lib/
│   │   └── api.js              # Fetch wrapper with in-memory token & 401 retry
│   ├── context/
│   │   └── AuthContext.js      # Global auth state, session restore, login/register/logout
│   ├── components/
│   │   ├── Navbar.js           # Navigation bar with user name, role, and logout
│   │   └── ProtectedPage.js    # Route guard wrapper with loading & login redirect
│   └── app/
│       ├── layout.js           # Root layout wrapping AuthProvider & Navbar
│       ├── globals.css         # TailwindCSS styles
│       ├── page.js             # Redirects to /dashboard
│       ├── login/page.js       # Login form with error alerts
│       ├── register/page.js    # Register form (name, email, password, role)
│       └── dashboard/page.js   # Protected dashboard placeholder
├── .gitignore
└── README.md
```

---

## Phase 1: Backend Setup, Models, and Authentication
- **Database Models (`api/models.py`)**: `User`, `Team`, `Task`, `Comment`, `Activity` with `to_dict()`.
- **Custom JWT (`api/auth.py`)**: 15m access tokens, 7d refresh tokens, `JWTAuth`, `IsAdmin`.
- **Auth Endpoints (`api/views_auth.py`)**: `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/me/`.

---

## Phase 2: Teams, Tasks, Comments, and Activity APIs
- **Teams (`api/views_teams.py`)**: Create (admin only), list member teams, get team details, invite members by email.
- **Tasks (`api/views_tasks.py`)**: Create task, list team tasks with status filter, get task, update task (triggers status log).
- **Comments (`api/views_tasks.py`)**: List comments oldest-first, post comments with author tracking.
- **Activity (`api/views_tasks.py`)**: Full reverse-chronological timeline of actions.

---

## Phase 3: Next.js Setup and Authentication

### What Was Built
1. **API Client ([frontend/lib/api.js](frontend/lib/api.js))**:
   - Stores the short-lived access token in memory (`inMemoryAccessToken`).
   - Automatically attaches `Authorization: Bearer <token>` to requests.
   - If a request returns `401 Unauthorized`:
     - Reads the `refreshToken` from `localStorage`.
     - Calls `POST /api/auth/refresh/` exactly **once**.
     - Updates the in-memory access token and transparently retries the failed request.
     - If the refresh token is expired or invalid, it purges `localStorage` and routes the user to `/login`.
   - Accesses `localStorage` strictly inside functions to eliminate Next.js server-side rendering errors.
   - Exports helpers: `api.get`, `api.post`, `api.patch`.

2. **Authentication Context ([frontend/context/AuthContext.js](frontend/context/AuthContext.js))**:
   - Manages global `user` and `loading` states.
   - On initial load: automatically restores the user session by exchanging `refreshToken` from `localStorage` for a fresh access token, then fetching `GET /api/auth/me/`.
   - `login(email, password)`: Sets token and user state.
   - `register(name, email, password, role)`: Registers the user and auto-logs them in.
   - `logout()`: Clears memory, removes tokens from `localStorage`, and redirects to `/login`.

3. **Navbar ([frontend/components/Navbar.js](frontend/components/Navbar.js))**:
   - Visible only when a user is logged in.
   - Shows brand title, current user name, role badge (`admin` or `member`), and a `Logout` button.

4. **Protected Page Wrapper ([frontend/components/ProtectedPage.js](frontend/components/ProtectedPage.js))**:
   - Shows a clean `"Loading..."` state while session restoration is pending.
   - If unauthenticated, smoothly redirects the visitor to `/login`.
   - Renders child content when authenticated.

5. **Pages**:
   - [frontend/app/page.js](frontend/app/page.js): Redirects automatically to `/dashboard`.
   - [frontend/app/login/page.js](frontend/app/login/page.js): Tailwind sign-in form with error alerts, redirects to `/dashboard` on success (or if already logged in).
   - [frontend/app/register/page.js](frontend/app/register/page.js): Registration form with name, email, password, and role selector (`Admin` / `Member`).
   - [frontend/app/dashboard/page.js](frontend/app/dashboard/page.js): Dashboard placeholder wrapped in `ProtectedPage`.

---

## How to Test Phase 3 by Hand

### 1. Ensure Backend is Running
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

### 2. Start Next.js Frontend
```bash
cd frontend
npm run dev -- -p 3000
```
Open your browser at `http://localhost:3000`.

### 3. Verification Steps
1. **Redirect on Root**:
   - Visit `http://localhost:3000/`. You should be redirected to `/dashboard`, which immediately redirects you to `http://localhost:3000/login` because you are unauthenticated.
2. **Register a New Account**:
   - On the login page, click **"Create an account"** (or go to `http://localhost:3000/register`).
   - Fill in:
     - Name: `Sarah Admin`
     - Email: `sarah@example.com`
     - Password: `Password123!`
     - Role: `Admin`
   - Click **"Sign Up"**.
   - You should be automatically logged in and redirected to `http://localhost:3000/dashboard`.
3. **Verify Dashboard & Navbar**:
   - The top navigation bar appears displaying `Sarah Admin`, the role badge `ADMIN`, and the **Logout** button.
   - The dashboard greeting shows `"Welcome, Sarah Admin!"`.
4. **Test Session Restoration on Page Reload**:
   - Hit **Refresh** (F5 / Ctrl+R) on `http://localhost:3000/dashboard`.
   - Notice you briefly see `"Loading..."` while the background token refresh occurs, and then you remain on the dashboard without losing your session.
5. **Test Protected Route Guard**:
   - Click **Logout**.
   - You are redirected to `/login`, and the Navbar disappears.
   - Try manually entering `http://localhost:3000/dashboard` in the address bar.
   - You are prevented from accessing it and immediately bounced back to `/login`.
