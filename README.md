# Team Task Tracker

A collaborative full-stack team task manager built with a Django + MongoDB backend and a Next.js (App Router) + TailwindCSS frontend.

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **MongoDB** running locally on port 27017 (or a MongoDB URI)

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with required settings
cat <<EOF > .env
SECRET_KEY=django-insecure-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
MONGODB_NAME=team_task_tracker
MONGODB_HOST=mongodb://localhost:27017/team_task_tracker
JWT_SECRET=access-token-secret-change-in-production
JWT_REFRESH_SECRET=refresh-token-secret-change-in-production
EOF

# Start the Django development server
python manage.py runserver 8000
```

The API will be available at `http://localhost:8000`.

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start Next.js development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## API Endpoints

### Authentication (`/api/auth/`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new user (`name`, `email`, `password`, `role`) | Public |
| `POST` | `/api/auth/login/` | Log in and receive access + refresh tokens | Public |
| `POST` | `/api/auth/refresh/` | Exchange `refreshToken` for a new `accessToken` | Public |
| `GET` | `/api/auth/me/` | Get current authenticated user profile | Authenticated |

### Teams (`/api/teams/`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/teams/` | List all teams the user belongs to | Authenticated |
| `POST` | `/api/teams/` | Create a new team with creator as first member | Admin only |
| `GET` | `/api/teams/<id>/` | Get team details and member roster | Team members |
| `POST` | `/api/teams/<id>/invite/` | Invite an existing user to team by email | Admin only |

### Tasks, Comments & Activity
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/teams/<id>/tasks/` | List team tasks (optional `?status=pending\|in_progress\|done`) | Team members |
| `POST` | `/api/teams/<id>/tasks/` | Create task (`title`, `description`, `assigned_to`, `status`) | Team members |
| `GET` | `/api/tasks/<id>/` | Get task details | Team members |
| `PATCH` | `/api/tasks/<id>/` | Update task fields (title, description, status, assignee) | Team members |
| `GET` | `/api/tasks/<id>/comments/` | List comments for a task (oldest first) | Team members |
| `POST` | `/api/tasks/<id>/comments/` | Post a comment (`text`) to a task | Team members |
| `GET` | `/api/teams/<id>/activity/` | Live reverse-chronological activity log | Team members |

---

## Roles and Permissions

- **`admin`**:
  - Can create new teams.
  - Can invite members to teams they belong to.
  - Can create, assign, update tasks, and post comments across their teams.
- **`member`**:
  - Can view teams they belong to.
  - Can create and update tasks within their teams.
  - Can post comments and view live activity.
  - Cannot create teams or invite members.
- **Resource Ownership Guard**: All team and task endpoints enforce membership verification—users can only access and modify resources belonging to teams of which they are a member.

---

## Authentication: JWT Access & Refresh Tokens

1. **Tokens**:
   - **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`. Stored strictly **in memory** on the client (`inMemoryAccessToken`) to prevent XSS exposure.
   - **Refresh Token**: Long-lived (7 days), signed with a separate `JWT_REFRESH_SECRET`. Stored in client `localStorage`.
2. **Fetch Interceptor (`frontend/lib/api.js`)**:
   - Automatically attaches `Authorization: Bearer <accessToken>` to API requests.
   - On a `401 Unauthorized` response:
     - Automatically calls `POST /api/auth/refresh/` using the stored `refreshToken`.
     - Updates the in-memory access token.
     - Retries the original request once.
     - If the refresh token is expired or invalid, clears storage and redirects to `/login`.
3. **Session Restoration (`frontend/context/AuthContext.js`)**:
   - On initial page load, reads the refresh token from `localStorage`, refreshes the session, and fetches `/api/auth/me/` before rendering protected pages.

---

## Assumptions & Design Choices

- **Role Selection**: Roles (`admin` or `member`) are chosen at registration for demo and testing convenience.
- **Invitations**: Inviting a member to a team simulates sending an email by printing a log message to the backend console (`Invitation sent to <email>`).
- **Registration Requirement**: Team invitations require that the invited email already belongs to a registered user in MongoDB.
