# StockSense – Full Stack Inventory Management System (WMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8.svg)](https://tailwindcss.com/)

**StockSense** is an enterprise-grade, production-ready Warehouse Inventory Management System built on the **MERN** stack (MongoDB, Express.js, React.js, Node.js). Designed for logistics hubs, distribution centers, and manufacturing businesses, StockSense replaces manual spreadsheet tracking with real-time stock monitoring, automated low-stock alerting, order fulfillment workflows, immutable audit trails, and executive business analytics.

---

## 🌟 Key Capabilities

### 1. Application Roles & Dual Dashboards
- **Role-Based Access Control (RBAC)** enforced at database, API, and UI routing layers:
  - **Admin**: Full authority to manage catalog SKUs, configure minimum thresholds, oversee all orders, manage operator user accounts, and review executive analytics.
  - **Operator**: Simplified operational station to search inventory, perform quick stock intake/dispatch adjustments, create fulfillment orders, and monitor replenishment alerts.

### 2. Smart Low-Stock Alert Engine
- Continuous threshold comparison:
  - `availableQuantity === 0` ➔ **Out of Stock** (Critical)
  - `availableQuantity <= minimumStockThreshold` ➔ **Low Stock** (High Priority)
  - `availableQuantity > minimumStockThreshold` ➔ **In Stock** (Healthy)
- **Zero-Spam Deduplication**: The alert service guarantees that only one active notification exists per unresolved product stock condition. When stock is replenished, past unresolved alerts are automatically resolved.

### 3. Order Processing & Inventory Integrity
- Validates stock sufficiency before order confirmation to prevent negative inventory balances.
- Deducts stock immediately upon order placement and logs an `ORDER_DEDUCTION` audit event.
- **Inventory Restoration Guarantee**: When an order is cancelled, all item quantities are automatically restored back into available inventory with an `ORDER_RESTORE` audit record.

### 4. Immutable Stock Movement History
- End-to-end audit trail tracking every modification:
  - `STOCK_IN` (Supplier receipts)
  - `STOCK_OUT` (Warehouse dispatches)
  - `ADJUSTMENT` (Cycle count audits & damage write-offs)
  - `ORDER_DEDUCTION` (Sales order fulfillment)
  - `ORDER_RESTORE` (Cancelled order item restoration)
- Logs previous quantity, new quantity, delta, user ID, timestamp, reason, and reference ID.

### 5. High-Performance Executive Analytics
- Real-time MongoDB aggregation pipelines computing:
  - Inventory Retail & Acquisition Cost Valuations
  - Unrealized Profit Margin calculations
  - Category-wise physical units and capital distribution
  - Stock-In vs. Stock-Out monthly movement velocity
  - Monthly gross sales order revenue trends
  - Top-selling products ranking
  - Slow-moving "Dead Stock" detection

### 6. Scalability for 500+ SKUs
- MongoDB indexed search by `sku`, `name`, `category`, `status`, and `availableQuantity`.
- Client-side search input debouncing (350ms) to reduce API roundtrips.
- Server-side pagination and sorting options.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Chart.js, react-chartjs-2, Axios, React Router DOM v6, React Hot Toast |
| **Backend** | Node.js, Express.js, Mongoose 8, JWT, bcryptjs, Express Validator, Morgan, CORS |
| **Database** | MongoDB (Atlas / Local MongoDB Server / Docker) |
| **DevOps & Containers** | Docker, Docker Compose, Multi-stage Nginx container |

---

## 🏗️ Architecture & Directory Structure

```
StockSense/
├── client/                      # React (Vite) Frontend Application
│   ├── src/
│   │   ├── components/          # Reusable UI (Navbar, Sidebar, StatCard, Badge, Modals)
│   │   ├── context/             # AuthContext & NotificationContext
│   │   ├── layouts/             # DashboardLayout Shell
│   │   ├── pages/               # AdminDashboard, OperatorDashboard, Inventory, Orders, History, Analytics, Users, Login
│   │   ├── services/            # Axios API client with auth interceptors
│   │   ├── utils/               # Formatters, Chart.js registration, CSV Export helpers
│   │   ├── App.jsx              # Role-protected route definitions
│   │   ├── index.css            # Tailwind directives & design tokens
│   │   └── main.jsx
│   ├── Dockerfile               # Multi-stage production build + Nginx
│   ├── nginx.conf               # Nginx reverse proxy routing
│   └── package.json
├── server/                      # Express.js REST API Backend
│   ├── config/                  # Database connection (Atlas & Local)
│   ├── controllers/             # Auth, Product, Inventory, Order, Analytics, Notification, User
│   ├── middleware/              # JWT auth protect, role authorize, validation, error handler
│   ├── models/                  # User, Product, Order, StockMovement, Notification
│   ├── routes/                  # Express API route modules
│   ├── scripts/                 # Realistic database seeder
│   ├── services/                # Smart alert deduplication service
│   ├── app.js                   # Express application configuration
│   ├── server.js                # Server entry point
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Multi-container orchestration (Mongo + API + Client)
├── README.md
└── .gitignore
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- Local MongoDB or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI

---

### Step 1: Clone and Configure Environment

```bash
git clone https://github.com/your-username/stocksense.git
cd stocksense
```

#### Backend Environment (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/stocksense
JWT_SECRET=stocksense_prod_ultra_secure_jwt_secret_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

#### Frontend Environment (`client/.env`):
```env
VITE_API_URL=/api
```

---

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

### Step 3: Seed Database

Populates Admin, Operator, 75+ realistic curated warehouse SKUs across 8 categories, initial stock movements, and sample customer orders:

```bash
cd ../server
npm run seed
```

**Pre-Configured Demo Credentials:**

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@stocksense.io` | `Password123!` |
| **Operator** | `operator@stocksense.io` | `Password123!` |

*(Note: The login page includes 1-click quick-fill buttons for both roles!)*

---

### Step 4: Run the Application

#### Start Backend (Port 5000):
```bash
cd server
npm start
# Server listens at http://localhost:5000/api
```

#### Start Frontend (Port 5173):
```bash
cd client
npm run dev
# Frontend accessible at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker & Docker Compose Setup

Run the entire stack (MongoDB container + Backend API + Frontend Nginx) in one command:

```bash
docker compose up --build -d
```

- **Frontend Client**: Accessible at `http://localhost` (Port 80)
- **Backend API**: Accessible at `http://localhost:5000/api`
- **MongoDB**: Listening at `localhost:27017`

To shut down:
```bash
docker compose down
```

---

## 📡 RESTful API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Private | Get authenticated user profile |
| `PUT` | `/api/auth/profile` | Private | Update user profile |
| `PUT` | `/api/auth/change-password` | Private | Change password |

### Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Private | Paginated, filtered & sorted catalog search |
| `GET` | `/api/products/categories` | Private | List all distinct categories |
| `GET` | `/api/products/:id` | Private | Get single product + recent audit movements |
| `POST` | `/api/products` | Admin | Create product, validate unique SKU |
| `PUT` | `/api/products/:id` | Admin | Update product details & thresholds |
| `DELETE` | `/api/products/:id` | Admin | Delete product (checks active orders) |

### Inventory & Movements (`/api/inventory`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/inventory/summary` | Private | Aggregated counts, valuations & statuses |
| `PATCH` | `/api/inventory/:id/stock` | Private | Adjust stock quantity (`ADD`, `REMOVE`, `SET`) |
| `GET` | `/api/inventory/low-stock` | Private | Retrieve items at or below threshold |
| `GET` | `/api/inventory/history` | Private | Paginated audit trail with date/type filters |

### Orders & Sales (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/orders` | Private | List orders with pagination & status filters |
| `GET` | `/api/orders/:id` | Private | Order details with itemized dispatches |
| `POST` | `/api/orders` | Private | Create order, check stock & deduct units |
| `PATCH` | `/api/orders/:id/status` | Private | Update status; **cancelling restores stock** |

### Analytics & Reports (`/api/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/dashboard` | Private | Executive KPIs, monthly trends & distributions |
| `GET` | `/api/analytics/inventory` | Private | Valuation breakdown, slow-moving items |
| `GET` | `/api/analytics/top-products` | Private | Top products ranked by units sold & revenue |

### Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Private | Active stock alerts & unread counter |
| `PATCH` | `/api/notifications/:id/read` | Private | Mark single or all alerts as read |
| `DELETE` | `/api/notifications/:id` | Private | Dismiss alert |

### User Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all registered users |
| `POST` | `/api/users` | Admin | Create new operator or admin account |
| `PUT` | `/api/users/:id` | Admin | Modify user role or active status |
| `DELETE` | `/api/users/:id` | Admin | Delete user account |

---

## ☁️ Production Deployment Guide

### Deploy Backend on [Render](https://render.com)
1. Push your repository to GitHub.
2. Create a **New Web Service** pointing to the repository.
3. Configure the settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<Secure Random 64-character String>`
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`

### Deploy Frontend on [Vercel](https://vercel.com)
1. Import repository on Vercel.
2. Select **Vite** Framework Preset.
3. Set **Root Directory** to `client`.
4. Configure Build & Output:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Set Environment Variables:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
