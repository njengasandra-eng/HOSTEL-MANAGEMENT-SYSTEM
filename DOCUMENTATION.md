# 🎓 HOSTEL MANAGEMENT SYSTEM (HMS)
## Complete Technical Documentation & Viva Defense Guide
> **Degree Program:** Computer Science / Information Technology Capstone Project  
> **Target Audience:** Examination Panel, Defense Committee & System Developers  

---

## 📑 Executive Summary

The **Hostel Management System (HMS)** is an enterprise-grade, web-based software application designed to automate university residential housing operations. The system eliminates manual room assignment errors, strictly enforces gender-segregated block allocation policies, prevents room overbooking, automates unpaid lease expirations, and provides real-time financial ledger tracking.

### 🎯 Key Objectives:
1. **Automated Allocation**: Dynamic room recommendation based on student gender and real-time room capacity.
2. **Policy Enforcement**: Strict segregation (Batian Block = Male, Nelion Block = Female) and hard capacity caps (2 beds per room).
3. **Transfer Approval Workflow**: Formal student request mechanism requiring administrator verification before database updates.
4. **Financial Control**: Cashless ledger management with integrated M-Pesa STK Push and Bank Transfer validation.
5. **Real-time Notifications**: In-app alert badges and notification drawers for instant decision feedback.

---

## 🛠 1. System Architecture & Technology Stack

The application follows a modern **RESTful Architecture** with **Client-Side Rendering (CSR)** and asynchronous HTTP data interchange.

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   HTML5 + Vanilla JavaScript (ES6+) + Tailwind CSS      │
└──────────────────────────┬──────────────────────────────┘
                           │ Async Fetch API (JSON)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION SERVER                    │
│             Node.js Runtime + Express.js API            │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Authentication, RBAC & Business Logic Middleware│   │
│   └─────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ Mongoose ORM
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                      │
│            MongoDB Atlas Cloud (Persistent NoSQL)       │
└─────────────────────────────────────────────────────────┘
```

### Technology Breakdown:

| Layer | Technology | Rationale & Selection Criteria |
|---|---|---|
| **Frontend UI** | HTML5, Vanilla JavaScript (ES6+), Tailwind CSS | Lightweight, zero build-step overhead, fast browser rendering, responsive design. |
| **Backend Runtime** | Node.js (v18+) | Asynchronous, event-driven, non-blocking I/O model for high concurrency handling. |
| **Web Framework** | Express.js (v4.19) | Minimalist RESTful routing, middleware support, efficient HTTP session handling. |
| **Database ORM** | Mongoose (v9.7) | Object Data Modeling (ODM) providing strict schema validation on top of MongoDB. |
| **Database Cloud** | MongoDB Atlas | Distributed, cloud-native NoSQL database with high availability and JSON-like document storage. |
| **Security / Auth** | BcryptJS + Express-Session | Cryptographic password hashing (blowfish cipher) and server-side HTTP session cookies (`HOSTELSESSID`). |

---

## 🗄 2. Database Schemas & Data Model

The database contains 7 primary document collections managed through Mongoose ORM schemas:

### 1. `User` (Administrator Account)
```javascript
{
  user_id:    { type: Number, unique: true },
  username:   { type: String, required: true, unique: true },
  password:   { type: String, required: true }, // Bcrypt hash
  email:      String,
  full_name:  String,
  role:       { type: String, default: 'admin' },
  created_at: String,
  updated_at: String
}
```

### 2. `Student` (Resident Account)
```javascript
{
  student_id:        { type: Number, unique: true },
  admission_number:  { type: String, required: true, unique: true },
  password:          { type: String, required: true }, // Bcrypt hash
  gender:            { type: String, enum: ['male', 'female'] },
  full_name:         String,
  email:             String,
  phone:             String,
  course:            String,
  date_of_admission: String,
  next_of_kin_name:  String,
  next_of_kin_phone: String,
  status:            { type: String, default: 'active' } // 'active' | 'inactive'
}
```

### 3. `Room` (Hostel Inventory)
```javascript
{
  room_id:            { type: Number, unique: true },
  room_number:        { type: String, required: true, unique: true },
  room_type:          { type: String, default: 'Double' },
  capacity:           { type: Number, default: 2 },
  monthly_rate:       { type: Number, default: 20000 },
  price:              { type: Number, default: 20000 },
  current_occupancy:  { type: Number, default: 0 },
  status:             { type: String, default: 'available' }, // 'available' | 'occupied' | 'maintenance'
  block_name:         String, // 'Batian' | 'Nelion'
  gender_restriction: String  // 'male' | 'female'
}
```

### 4. `Allocation` (Room Lock & Assignment)
```javascript
{
  allocation_id:         { type: Number, unique: true },
  student_id:            Number,
  room_id:               Number,
  allocation_date:       String,
  status:                String, // 'active' | 'pending_payment' | 'cancelled'
  booking_code:          String, // e.g., 'BK-89A12B'
  lease_expires_at:      String, // 5-day holding timestamp
  expected_checkout_date:String
}
```

### 5. `Payment` (Financial Ledger Record)
```javascript
{
  payment_id:     { type: Number, unique: true },
  student_id:     Number,
  allocation_id: Number,
  amount:        Number,
  payment_date:  String,
  payment_method:String, // 'M-Pesa' | 'Bank transfer' | 'Card'
  remarks:       String, // Transaction code & booking reference
  fee_category:  { type: String, default: 'Hostel Accommodation Fee' }
}
```

### 6. `TransferRequest` (Room Change Workflow)
```javascript
{
  request_id:      { type: Number, unique: true },
  student_id:      Number,
  current_room_id: Number,
  target_room_id:  Number,
  status:          { type: String, default: 'pending' }, // 'pending' | 'approved' | 'rejected'
  student_read:    { type: Boolean, default: false },
  reason:          String,
  admin_remarks:   String
}
```

### 7. `AuditLog` (System Activity Tracking)
```javascript
{
  log_id:     { type: Number, unique: true },
  user_id:    Number,
  action:     String, // 'LOGIN', 'ROOM_BOOKED', 'TRANSFER_APPROVED', etc.
  table_name: String,
  record_id:  Number,
  details:    String,
  created_at: String
}
```

---

## ⚙️ 3. Core Business Logic & Algorithms

### Algorithm 1: Gender-Restricted Allocation Filter
```
Input: Student S, Desired Room R
1. Retrieve S.gender
2. Retrieve R.gender_restriction and R.current_occupancy, R.capacity
3. IF (S.gender != R.gender_restriction) THEN
      REJECT ("Gender policy violation: Room is restricted to " + R.gender_restriction)
4. ELSE IF (R.current_occupancy >= R.capacity) THEN
      REJECT ("Room capacity full")
5. ELSE
      GRANT ALLOCATION (Create Allocation record, increment R.current_occupancy)
```

### Algorithm 2: 5-Day Automated Lease Expiration
The background worker executes `checkAndExpireLeases()` periodically:
```
1. Get CurrentDate
2. FOR EACH Allocation A where A.status == 'pending_payment':
      IF CurrentDate > A.lease_expires_at THEN
         A.status = 'cancelled'
         Retrieve Room R where R.room_id == A.room_id
         R.current_occupancy = MAX(0, R.current_occupancy - 1)
         R.status = 'available'
         Log Audit ("Lease expired for booking code " + A.booking_code)
```

### Algorithm 3: Room Transfer Approval Execution
When an Admin approves a transfer request:
```
1. Fetch Request REQ
2. Fetch OldRoom where room_id == REQ.current_room_id
3. Fetch TargetRoom where room_id == REQ.target_room_id
4. Fetch ActiveAllocation where student_id == REQ.student_id AND status == 'active'
5. Decrement OldRoom.current_occupancy
6. Increment TargetRoom.current_occupancy
7. Update ActiveAllocation.room_id = TargetRoom.room_id
8. Mark REQ.status = 'approved', REQ.student_read = false
9. Send alert to Student Notification Drawer
```

---

## 🔒 4. Security Architecture

1. **Password Encryption**: Passwords are never stored in plain text. Hashing is performed using `bcryptjs` with a cost factor of **10 salt rounds**.
2. **Session Security & RBAC**:
   - `requireAuth` middleware verifies `req.session.userId` exists.
   - `requireAdmin` middleware verifies `req.session.role === 'admin'`.
   - Cookies use `HOSTELSESSID` with `httpOnly: true` to prevent Cross-Site Scripting (XSS) session hijacking.
3. **Cashless Payment Validation**:
   - Cash payment option is disabled.
   - M-Pesa STK push simulation and Bank Slip Reference numbers are recorded for audit traceability.
4. **Input Sanitization**: Trimmed and sanitized user inputs prevent script injection.

---

## 🎤 5. Viva / Examination Defense Q&A

Use these exact technical responses when asked by panelists:

#### **Q1: Why did you choose Node.js and MongoDB over PHP and MySQL?**
> *"Node.js provides a non-blocking, event-driven I/O model ideal for handling concurrent REST requests. MongoDB Atlas was chosen for its schema flexibility, document-oriented JSON structure matching JavaScript natively, and high cloud availability. Using Mongoose ODM gives us strict schema validation while retaining NoSQL scalability."*

#### **Q2: GitHub shows 86% HTML. Does that mean the project lacks backend code?**
> *"No. GitHub language detection counts file byte sizes based on extension (`.html`). Our frontend is structured as Single-Page Application (SPA) templates containing embedded UI layouts, Tailwind styling, and client JS `<script>` blocks. The backend logic resides entirely in `server.js`, `routes/` (Express API controllers), and `db/database.js` (Mongoose ODM layer)."*

#### **Q3: How do you prevent two students from booking the same last bed simultaneously (Race Condition)?**
> *"Room capacity checks are evaluated atomically at the server API layer before creating the allocation record. In a production environment, MongoDB transactions (`session.startTransaction()`) or Redis lock mechanisms enforce ACID isolation during occupancy updates."*

#### **Q4: What happens if a student reserves a room but does not pay?**
> *"The system implements a 5-day automated lease holding policy (`checkAndExpireLeases()`). Bookings marked as `pending_payment` automatically expire after 5 days, releasing the bed back into the available room pool without manual admin intervention."*

#### **Q5: How does the room transfer workflow operate?**
> *"Students submit transfer requests specifying target rooms and reasons. The request is placed in a `pending` state. The room allocation does NOT change until the Administrator reviews and explicitly approves the request via the Admin Portal. Upon approval, the system atomically updates both room occupancies and notifies the student via an in-app alert banner."*

---

## 💻 6. Local Setup & Live Deployment Summary

- **Local Execution**: `npm install` ➔ `$env:MONGODB_URI="<your_atlas_uri>"` ➔ `npm start`
- **Live Production URL**: Hosted on Render (`.onrender.com`) connected to MongoDB Atlas Cloud.
- **Auto-Seeding**: Automatic initialization seeds default Admin (`admin`/`admin123`), sample students (`ADM001`), and **100 hostel rooms** (Batian Male & Nelion Female).
