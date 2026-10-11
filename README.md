# Campus Lost & Found Portal — Complete Build Guide

A full-stack web app for students to report and browse lost/found items,
built with **Express.js + MongoDB** on the backend and **plain HTML/CSS/JS**
on the frontend (no build step, no framework — easy to swap in React later).

**Features:**
- Full CRUD on lost/found reports, with free-text search and category/status filtering
- **Accounts** — JWT-based register/login; passwords hashed with bcrypt
- **Ownership** — only the original poster (or an admin) can edit/delete/resolve a listing
- **Claim & verify workflow** — anyone logged in can respond to someone else's
  listing ("this is mine" or just a question); the poster **verifies** a
  response to confirm the right person, which auto-resolves the item and
  records who it went to
- **Live stats bar** — total lost / found / resolved, pulled via a MongoDB aggregation
- **"My Reports" dashboard** — your listings plus any pending claims on them, all in one place
- **Item detail page** with the full response thread and inline editing for your own listings
- Toast notifications + a styled confirm dialog instead of browser alert()/confirm()

```
campus-lost-found/
├── backend/
│   ├── config/db.js           # MongoDB connection
│   ├── middleware/auth.js     # JWT verification (protect / optionalAuth)
│   ├── models/
│   │   ├── User.js            # name, email, hashed password, role
│   │   ├── Item.js            # lost/found report, owned by a User
│   │   └── Response.js        # a comment or claim left on an item
│   ├── routes/
│   │   ├── auth.js            # register / login / me
│   │   ├── items.js           # CRUD + search/filter/stats/mine
│   │   └── responses.js       # respond to + verify claims on an item
│   ├── server.js              # Express app entry point
│   ├── seed.js                # Optional: loads 3 demo accounts + sample items
│   ├── .env.example           # Copy to .env
│   └── package.json
└── frontend/
    ├── index.html             # The board: stats, search, filter, browse
    ├── auth.html              # Login / register
    ├── report.html            # Form to report a lost/found item (requires login)
    ├── item.html              # Item detail: full info, edit (owner), response thread
    ├── my-items.html          # "My Reports" dashboard + pending claims to verify
    ├── css/style.css          # Corkboard / pinned-flyer visual theme
    └── js/
        ├── api.js             # fetch() wrapper, auth token handling
        ├── nav.js             # shared header: shows login state on every page
        ├── toast.js           # toast notifications + styled confirm dialog
        ├── auth.js            # login/register form logic
        ├── board.js           # board page logic
        ├── report.js          # report page logic
        ├── item.js            # item detail + response thread logic
        └── my-items.js        # dashboard logic
```

---

## 1. Prerequisites

- **Node.js** 18+ and npm — check with `node -v`
- **MongoDB** — either:
  - Local install ([MongoDB Community Server](https://www.mongodb.com/try/download/community)), or
  - Free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (recommended if you don't want to install anything)
- A code editor (VS Code) and a way to serve static files (VS Code's **Live Server** extension is the easiest)

---

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `MONGO_URI`:

- **Local Mongo:** `mongodb://127.0.0.1:27017/campus_lost_found`
- **Atlas:** grab the connection string from Atlas → Connect → "Drivers", e.g.
  `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/campus_lost_found?retryWrites=true&w=majority`

Start the server:

```bash
npm run dev      # with nodemon, auto-restarts on changes
# or
npm start
```

You should see:

```
MongoDB connected: ...
Campus Lost & Found API running on http://localhost:5000
```

Sanity check in your browser: `http://localhost:5000/api/health` → `{"status":"ok",...}`

Optional — load sample data so the board isn't empty:

```bash
node seed.js
```

### API reference

| Method | Route                              | Auth required | Description |
|--------|-------------------------------------|:---:|-------------|
| GET    | `/api/health`                       |  | Health check |
| POST   | `/api/auth/register`                |  | Create an account → `{ token, user }` |
| POST   | `/api/auth/login`                   |  | Log in → `{ token, user }` |
| GET    | `/api/auth/me`                      | ✓ | Verify a stored token / fetch fresh user info |
| GET    | `/api/items`                        |  | List — supports `?q=&category=&status=&resolved=&page=&limit=&sort=` |
| GET    | `/api/items/categories`             |  | Fixed list of categories |
| GET    | `/api/items/stats`                  |  | Counts for the stats bar |
| GET    | `/api/items/mine/list`              | ✓ | Items you've posted |
| GET    | `/api/items/:id`                    |  | Get one item |
| POST   | `/api/items`                        | ✓ | Create an item (poster = logged-in user) |
| PUT    | `/api/items/:id`                    | ✓ owner/admin | Update an item |
| PATCH  | `/api/items/:id/resolve`            | ✓ owner/admin | Mark resolved / reopen |
| DELETE | `/api/items/:id`                    | ✓ owner/admin | Delete an item |
| GET    | `/api/items/:itemId/responses`      |  | List responses/claims on an item |
| POST   | `/api/items/:itemId/responses`      | ✓ | Post a response (not on your own item) |
| PATCH  | `/api/responses/:id/verify`         | ✓ item owner/admin | Confirm a claim → auto-resolves the item |
| DELETE | `/api/responses/:id`                | ✓ author/owner/admin | Delete a response |

Authenticated requests send the token from login/register as a header:
`Authorization: Bearer <token>` (the frontend's `js/api.js` does this automatically
once you're logged in).

Example item payload (POST/PUT body) — `contactName`/`contactEmail`/`postedBy`
are set server-side from the logged-in user, never trusted from the client:

```json
{
  "title": "Blue Jansport backpack",
  "description": "Contains a chemistry textbook and calculator",
  "category": "Bags",
  "status": "lost",
  "location": "Library, 2nd floor",
  "date": "2026-08-01",
  "imageUrl": ""
}
```

Search (`q`) uses a MongoDB **text index** across `title`, `description`, and
`location`, so `GET /api/items?q=backpack&status=lost` finds lost backpack
reports regardless of which of those fields the word appears in.

### The claim & verify flow

This is the feature that actually reunites people with their stuff, not just
a CRUD demo:

1. A student finds something and posts it with **status: found**.
2. Another student browses the board, opens the item, and leaves a response —
   checking **"This is a claim"** if they believe it's theirs, with enough
   detail to prove it (e.g. "it has a scratch on the left strap").
3. The poster sees it on the item page or their **My Reports** dashboard and
   clicks **Verify & resolve** once they're convinced. This sets the item's
   `resolved` flag, stamps `resolvedBy`/`resolvedAt`, and marks that response
   `verified`.
4. Anyone can still leave non-claim responses (questions) at any point —
   `isClaim` is just a flag on the message, verification is what resolves it.

---

## 3. Frontend setup

The frontend is static HTML/CSS/JS — no build tools required. It calls the
API at `http://localhost:5000/api` (see `frontend/js/api.js` — change
`API_BASE` if your backend runs elsewhere, e.g. after you deploy it).

Easiest way to run it locally:

1. In VS Code, install the **Live Server** extension.
2. Right-click `frontend/index.html` → **Open with Live Server**.
3. It'll open at something like `http://127.0.0.1:5500`.

Because the backend uses CORS, make sure that origin is listed in your
backend `.env` under `CLIENT_ORIGIN` (the `.env.example` already includes
the default Live Server ports).

Alternative without an extension:

```bash
cd frontend
npx serve .
```

---

## 4. What each feature maps to (for your resume bullets)

- **CRUD operations** → `routes/items.js` (POST/GET/PUT/PATCH/DELETE), wired
  up to the board (`board.js`) and report form (`report.js`).
- **Search** → MongoDB text index in `models/Item.js` + the `q` query param.
- **Category-based filtering** → `category`/`status` query params, populated
  dynamically from `GET /api/items/categories`.
- **RESTful backend with Express + MongoDB** → `server.js`, `config/db.js`,
  `models/Item.js`, `routes/items.js`, using Mongoose for schema validation.
- **Responsive, intuitive interface** → `css/style.css` uses CSS Grid with
  `auto-fill`/`minmax` for the board and a mobile breakpoint at 720px/480px.

---

## 5. Suggested next steps

- **Image uploads**: swap the `imageUrl` text field for real uploads using
  `multer` + a storage bucket (S3, Cloudinary) instead of a pasted URL.
- **Email notifications**: notify a "lost" poster when a matching "found"
  item is reported (compare category + fuzzy-match title/description), and
  notify both sides when a claim is verified.
- **Admin view**: the `role: "admin"` field already exists on `User` and is
  already honored by every ownership check in the API — add a simple
  `/admin` page that lists every item/response so an admin can moderate.
  (Promote a user to admin for now by editing their document directly in
  MongoDB: `db.users.updateOne({email:"..."},{$set:{role:"admin"}})`.)
- **Deploy**: backend to Render/Railway/Fly.io (set `MONGO_URI` to an Atlas
  cluster and `JWT_SECRET` to a real secret), frontend to
  Netlify/Vercel/GitHub Pages, then update `API_BASE` in `js/api.js` to your
  deployed backend URL and `CLIENT_ORIGIN` in the backend `.env` to match.
- **Tests**: add Jest + Supertest for the routes (auth, CRUD, the
  claim/verify flow) — good evidence of the "debugged and tested core
  features" resume bullet.

---

## 6. Troubleshooting

- **"MongoDB connection failed"** — check `MONGO_URI`, and if using Atlas,
  make sure your current IP is allow-listed under Network Access.
- **CORS errors in the browser console** — add your frontend's exact origin
  (protocol + host + port) to `CLIENT_ORIGIN` in `backend/.env` and restart
  the server.
- **Board says "Couldn't reach the board"** — the backend isn't running, or
  `API_BASE` in `frontend/js/api.js` doesn't match where it's running.
