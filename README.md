# INVOICE PRO – COMPLETE INVOICE MANAGEMENT SYSTEM

![Invoice Pro](https://img.shields.io/badge/System-Invoice%20Pro-4F46E5?style=for-the-badge&logo=cashapp&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Invoice Pro** is a complete, production-grade, multi-tenant SaaS Invoice Management System built with a modern React.js frontend, an Express.js REST API backend, and relational database architecture (MySQL 8.0+ with resilient zero-config fallback).

---

## 🌟 Key Features by Module

### 1. 🔐 Authentication & Multi-Tenancy Module
- **User Registration**: Register with Full Name, Business Name, Email, Phone, and Password.
- **Strict Data Isolation**: Each registered business owner only accesses their own customers, products, invoices, payments, and financial reports.
- **JWT Authentication**: Secure stateless tokens signed with `jsonwebtoken` stored in browser storage.
- **Bcrypt Hashing**: All passwords securely salted and hashed.
- **Password Reset Flow**: Request reset token and reset password with validation.
- **Rate Limiting**: Brute-force protection on authentication endpoints.

### 2. 📊 Dynamic SaaS Dashboard
- **6 Real-Time Metric Cards**:
  - Total Invoices
  - Paid Invoices
  - Pending Invoices
  - Overdue Invoices
  - Total Revenue (actual settled funds)
  - Outstanding Amount (pending receivables)
- **Monthly Revenue Chart**: Interactive Recharts bar/trend visualization filterable by year.
- **Invoice Distribution Chart**: Live donut/pie distribution of invoice statuses.
- **Recent Invoices Table**: Real-time table with direct links to view, download PDF, or record payment.
- **Quick Action Bar**: Shortcuts to create invoices, register clients, or record incoming payments.

### 3. 👥 Customer Management Module
- Complete CRUD (Add, Edit, View, Delete, Search, and Filter).
- Comprehensive details page showing:
  - Total invoices billed
  - Gross amount invoiced
  - Total settled payments
  - Real-time outstanding customer balance
  - Complete invoice history table
  - Complete payment history table
- **Data Integrity Protection**: Safely prevents accidental deletion of customers with existing active invoices.

### 4. 📦 Products & Services Catalogue
- Catalogue management for services and physical products.
- Fields: Name, Category, Description, Standard Unit Price, GST Rate (0%, 5%, 12%, 18%, 28%), and Type.
- Quick auto-fill inside invoice creation forms.

### 5. 🧾 Invoice Management Module (Core)
- **Automatic Sequence Numbering**: Generated using custom prefix (e.g., `INV-1001`) from business settings.
- **Dynamic Line Items**: Add, remove, and reorder items with real-time decimal precision.
- **GST Compliance**:
  - **Intra-State**: Splits tax equally into **CGST** and **SGST**.
  - **Inter-State**: Applies integrated **IGST**.
- **Real-Time Computations**:
  - Line Total = `Qty × Unit Price × (1 - Discount%) × (1 + Tax%)`
  - Subtotal = Sum of line amounts before taxes and discounts
  - Grand Total = `Subtotal - Discount + Tax`
  - Amount Due = `Grand Total - Total Payments Received`
- **Dynamic Statuses**: `Draft`, `Pending`, `Partially Paid`, `Paid`, `Overdue`, and `Cancelled`.
- **A4 PDF Generation & Direct Printing**:
  - High-fidelity PDF generation via both backend (`pdfkit`) and frontend (`jspdf`/`jspdf-autotable`).
  - Browser print styles formatted for A4 without sidebars/headers.

### 6. 💳 Payment Management Module
- Record full or partial payments against invoices.
- **Overpayment Guard**: Enforces database transactions that reject any payment exceeding the invoice's remaining balance due.
- **Status Synchronization**: Automatically transitions invoice to `Partially Paid` or `Paid`.
- Supports payment methods: **UPI**, **Bank Transfer (NEFT/RTGS/IMPS)**, **Credit/Debit Card**, **Cash**, **Cheque**, and **Other**.
- Full transaction reference tracking (UTR numbers).

### 7. 📈 Reports & Analytics Module
- **Monthly Revenue Report**: Month-by-month billing vs collection with growth insights.
- **Yearly Revenue Report**: Year-over-year revenue comparisons.
- **Paid vs Unpaid Report**: Status breakdown with counts, total invoiced, settled, and outstanding.
- **Customer-Wise Ledger**: Client-by-client billing, collection, and pending balance ledger.
- **Exporting**: One-click export to **CSV** and print-ready reports.

### 8. ⚙️ Business Settings Module
- Configure Business Name, Email, Phone, Address, GSTIN, Currency (`INR ₹`), and Invoice Prefix.
- Set default payment terms and footer notes.
- Company logo upload (JPEG, PNG, WebP, SVG).
- User profile update and password change.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS, React Router DOM v6, Axios, Recharts, Lucide React, Day.js, React Hot Toast, jsPDF, jsPDF-AutoTable |
| **Backend** | Node.js, Express.js, REST API architecture, JWT, bcryptjs, express-validator, express-rate-limit, cors, dotenv, multer, pdfkit |
| **Database** | MySQL 8.0+ (`mysql2/promise`), Foreign Keys, Indexes, `DECIMAL(15,2)` for currency, plus resilient zero-config embedded storage fallback |

---

## 📂 Project Structure

```
d:\INVOICE MANAGEMENT\
├── backend/
│   ├── config/
│   │   └── db.js                 # Unified database pool & migration manager
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, JWT, password resets
│   │   ├── customerController.js # Customer CRUD & invoice history
│   │   ├── productController.js  # Products catalogue
│   │   ├── invoiceController.js  # Invoice creation, status, and PDF streaming
│   │   ├── paymentController.js  # Transactional payments & reconciliation
│   │   ├── dashboardController.js# Summary stats & Recharts data
│   │   ├── reportController.js   # Monthly, yearly, customer-wise reports
│   │   └── settingController.js  # Business profile, logo upload, passwords
│   ├── middleware/
│   │   ├── authMiddleware.js     # Bearer token verification
│   │   ├── validatorMiddleware.js# Express validator response wrapper
│   │   ├── uploadMiddleware.js   # Multer file upload filter for logos
│   │   └── errorMiddleware.js    # Global error handler
│   ├── routes/                   # REST API route declarations
│   ├── services/
│   │   ├── invoiceService.js     # Accurate monetary math & status progression
│   │   └── pdfService.js         # PDFKit server-side PDF generator
│   ├── utils/
│   │   ├── testSuite.js          # Automated end-to-end API test runner
│   │   └── dbInit.js             # Database migration CLI script
│   ├── uploads/                  # Business logo storage
│   ├── server.js                 # Express application entrypoint
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Button, Input, Select, Modal, ConfirmDialog, Badge, Spinner
│   │   │   ├── layout/           # Sidebar, Topbar, DashboardLayout
│   │   │   └── invoices/         # InvoiceItemRow, InvoiceStatusBadge, InvoicePrintView
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global user state & token persistence
│   │   ├── pages/
│   │   │   ├── auth/             # Login, Register, ForgotPassword
│   │   │   ├── dashboard/        # Dashboard
│   │   │   ├── customers/        # CustomerList, CustomerDetails, CustomerModal
│   │   │   ├── products/         # ProductList, ProductModal
│   │   │   ├── invoices/         # InvoiceList, InvoiceCreate, InvoiceEdit, InvoiceDetails
│   │   │   ├── payments/         # PaymentList, RecordPaymentModal
│   │   │   ├── reports/          # Reports
│   │   │   └── settings/         # Settings
│   │   ├── services/             # Axios API service wrappers
│   │   ├── utils/
│   │   │   ├── formatters.js     # INR currency & date formatters
│   │   │   └── pdfGenerator.js   # Client-side jsPDF generator
│   │   ├── App.jsx               # Route declarations & toaster
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── database/
│   ├── schema.sql                # Complete MySQL DDL scripts
│   └── seed.sql                  # Comprehensive sample seed data
│
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js** v18 or higher (v24 recommended)
- **npm** v9 or higher
- **MySQL Server** (optional; the system automatically connects to MySQL if running or uses zero-config resilient local storage if offline)

### 1. Database Configuration
Open `backend/.env` (or copy from `backend/.env.example`):
```env
PORT=5000
NODE_ENV=development

# MySQL Database Settings
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=invoice_pro

# JWT Secret
JWT_SECRET=super_secret_jwt_key_invoice_pro_2026_secure!
JWT_EXPIRES_IN=7d
```

*(Optional)* If importing directly via MySQL CLI:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Start Backend API Server
```bash
# Navigate to backend and start
cd backend
npm start
```
The backend will run on `http://localhost:5000` and automatically verify database connectivity, tables, and seed initial records.

### 3. Start Frontend Development Server
In a second terminal window:
```bash
# Navigate to frontend and start
cd frontend
npm run dev
```
The React frontend will be accessible at `http://localhost:5173`.

---

## 🔑 Pre-Configured Demo Credentials

For immediate testing, use the pre-configured demo account or click **"Fill Pre-configured Demo Account"** on the login page:

| Field | Demo Credential |
| :--- | :--- |
| **Email** | `demo@invoicepro.com` |
| **Password** | `password123` |
| **Business** | Apex Digital Solutions Pvt Ltd |

---

## 🧪 Automated Test Suite

Run the full end-to-end API test suite:
```bash
node backend/utils/testSuite.js
```
The test suite verifies:
- Health checks
- Authentication & JWT issuance
- Dashboard dynamic summary calculations
- Customer CRUD & balance tracking
- Product catalogue management
- Dynamic sequence invoice number generation
- Line items, discounts, CGST/SGST/IGST precision math
- Partial & full payment reconciliation
- Overpayment protection (cannot exceed remaining balance)
- Server-side PDF invoice generation
- Data integrity protection on customer deletion

---

## 🛡️ Security Architecture
1. **Parameterized Queries**: All database operations use prepared statements to prevent SQL injection.
2. **Password Encryption**: Salted bcrypt hashing with 10 salt rounds.
3. **Data Scoping**: Every query filters by `user_id = req.user.id` to guarantee tenant isolation.
4. **Input Validation**: Express Validator validates email formats, numerical values, and non-empty strings.
5. **Rate Limiting**: Rate limiter blocks credential brute-forcing on authentication routes.
6. **File Upload Security**: Strict MIME-type checking and file size restrictions on uploaded business logos.

---

## 📄 License
This project is licensed under the MIT License. Built for commercial SaaS invoice management.
