const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Schemas ──────────────────────────────────────────────────────────────────

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

async function nextId(name) {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const doc = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      return doc.seq;
    } catch (err) {
      console.error('Counter error, using memory fallback:', err.message);
    }
  }

  const map = {
    user_id: cache.users,
    student_id: cache.students,
    room_id: cache.rooms,
    allocation_id: cache.allocations,
    payment_id: cache.payments,
    log_id: cache.audit_logs,
    request_id: cache.transfer_requests,
    notice_id: cache.notices
  };
  const list = map[name] || [];
  const max = list.reduce((m, item) => Math.max(m, item[name] || 0), 0);
  return max + 1;
}

// Users
const userSchema = new mongoose.Schema({
  user_id:    { type: Number, unique: true },
  username:   { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  email:      String,
  full_name:  String,
  role:       { type: String, default: 'admin' },
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
});
const User = mongoose.model('User', userSchema);

// Students
const studentSchema = new mongoose.Schema({
  student_id:        { type: Number, unique: true },
  admission_number:  { type: String, required: true, unique: true },
  password:          String,
  gender:            String,
  full_name:         String,
  email:             String,
  phone:             String,
  course:            String,
  date_of_admission: String,
  next_of_kin_name:  String,
  next_of_kin_phone: String,
  status:            { type: String, default: 'active' },
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
});
const Student = mongoose.model('Student', studentSchema);

// Rooms
const roomSchema = new mongoose.Schema({
  room_id:           { type: Number, unique: true },
  room_number:       { type: String, required: true, unique: true },
  room_type:         String,
  capacity:          { type: Number, default: 2 },
  monthly_rate:      { type: Number, default: 20000 },
  price:             { type: Number, default: 20000 },
  current_occupancy: { type: Number, default: 0 },
  status:            { type: String, default: 'available' },
  floor:             Number,
  block_name:        String,
  gender_restriction:String,
  amenities:         String,
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
});
const Room = mongoose.model('Room', roomSchema);

// Allocations
const allocationSchema = new mongoose.Schema({
  allocation_id:         { type: Number, unique: true },
  student_id:            Number,
  room_id:               Number,
  allocation_date:       String,
  expected_checkout_date:String,
  status:                { type: String, default: 'active' },
  booking_code:          String,
  lease_expires_at:      String,
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
});
const Allocation = mongoose.model('Allocation', allocationSchema);

// Payments
const paymentSchema = new mongoose.Schema({
  payment_id:     { type: Number, unique: true },
  student_id:     Number,
  hostel_block:   String,
  fee_category:   String,
  billing_month:  String,
  due_date:       String,
  amount:         Number,
  payment_date:   String,
  status:         { type: String, default: 'completed' },
  payment_method: String,
  remarks:        String,
  created_at: { type: String, default: () => new Date().toISOString() }
});
const Payment = mongoose.model('Payment', paymentSchema);

// Audit Logs
const auditLogSchema = new mongoose.Schema({
  log_id:     { type: Number, unique: true },
  user_id:    mongoose.Schema.Types.Mixed,
  action:     String,
  table_name: String,
  record_id:  Number,
  details:    String,
  created_at: { type: String, default: () => new Date().toISOString() }
});
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Transfer Requests
const transferRequestSchema = new mongoose.Schema({
  request_id:       { type: Number, unique: true },
  student_id:       Number,
  request_type:     { type: String, default: 'transfer' },
  current_room_id:  Number,
  target_room_id:   Number,
  swap_student_id:  Number,
  status:           { type: String, default: 'pending' },
  student_read:     { type: Boolean, default: false },
  reason:           String,
  admin_remarks:    String,
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
});
const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

// Notices
const noticeSchema = new mongoose.Schema({
  notice_id:  { type: Number, unique: true },
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  block_name: { type: String, default: 'Batian' },
  room_range: { type: String, default: 'BAT-001 to BAT-005' },
  posted_by:  { type: String, default: 'Admin' },
  created_at: { type: String, default: () => new Date().toISOString() }
});
const Notice = mongoose.model('Notice', noticeSchema);

// ─── In-memory cache (populated at startup) ───────────────────────────────────
let cache = {
  users: [],
  students: [],
  rooms: [],
  allocations: [],
  payments: [],
  audit_logs: [],
  transfer_requests: [],
  notices: []
};

async function loadCache() {
  cache.users             = (await User.find().lean()).map(mongoToPlain);
  cache.students          = (await Student.find().lean()).map(mongoToPlain);
  cache.rooms             = (await Room.find().lean()).map(mongoToPlain);
  cache.allocations       = (await Allocation.find().lean()).map(mongoToPlain);
  cache.payments          = (await Payment.find().lean()).map(mongoToPlain);
  cache.audit_logs        = (await AuditLog.find().lean()).map(mongoToPlain);
  cache.transfer_requests = (await TransferRequest.find().lean()).map(mongoToPlain);
  cache.notices           = (await Notice.find().lean()).map(mongoToPlain);
}

function mongoToPlain(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return rest;
}

// ─── Async write helpers (fire-and-forget) ────────────────────────────────────

function saveUser(data)            { User.findOneAndUpdate({ user_id: data.user_id }, data, { upsert: true }).exec().catch(console.error); }
function saveStudent(data)         { Student.findOneAndUpdate({ student_id: data.student_id }, data, { upsert: true }).exec().catch(console.error); }
function saveRoom(data)            { Room.findOneAndUpdate({ room_id: data.room_id }, data, { upsert: true }).exec().catch(console.error); }
function saveAllocation(data)      { Allocation.findOneAndUpdate({ allocation_id: data.allocation_id }, data, { upsert: true }).exec().catch(console.error); }
function savePayment(data)         { Payment.findOneAndUpdate({ payment_id: data.payment_id }, data, { upsert: true }).exec().catch(console.error); }
function saveAuditLog(data)        { AuditLog.findOneAndUpdate({ log_id: data.log_id }, data, { upsert: true }).exec().catch(console.error); }
function saveTransferRequest(data) { TransferRequest.findOneAndUpdate({ request_id: data.request_id }, data, { upsert: true }).exec().catch(console.error); }
function saveNotice(data)          { Notice.findOneAndUpdate({ notice_id: data.notice_id }, data, { upsert: true }).exec().catch(console.error); }

function deleteFromDB(Model, query) { Model.deleteOne(query).exec().catch(console.error); }

// ─── Public db API (mirrors original JSON-file API, all sync) ─────────────────

const db = {
  users: {
    find:    (fn) => fn ? cache.users.filter(fn) : cache.users,
    findOne: (fn) => cache.users.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('user_id');
      const obj = { user_id: id, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      cache.users.push(obj);
      saveUser(obj);
      return obj;
    }
  },

  students: {
    find:    (fn) => fn ? cache.students.filter(fn) : [...cache.students],
    findOne: (fn) => cache.students.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('student_id');
      const obj = { student_id: id, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      cache.students.push(obj);
      saveStudent(obj);
      return obj;
    },
    update: (studentId, updates) => {
      const idx = cache.students.findIndex(s => s.student_id === parseInt(studentId));
      if (idx === -1) return false;
      cache.students[idx] = { ...cache.students[idx], ...updates, updated_at: new Date().toISOString() };
      saveStudent(cache.students[idx]);
      return true;
    },
    delete: (studentId) => {
      const before = cache.students.length;
      cache.students = cache.students.filter(s => s.student_id !== parseInt(studentId));
      if (cache.students.length < before) {
        deleteFromDB(Student, { student_id: parseInt(studentId) });
        return true;
      }
      return false;
    }
  },

  rooms: {
    find:    (fn) => fn ? cache.rooms.filter(fn) : [...cache.rooms],
    findOne: (fn) => cache.rooms.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('room_id');
      const obj = {
        room_id: id, ...data,
        current_occupancy: parseInt(data.current_occupancy || 0),
        capacity: parseInt(data.capacity || 2),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      cache.rooms.push(obj);
      saveRoom(obj);
      return obj;
    },
    update: (roomId, updates) => {
      const idx = cache.rooms.findIndex(r => r.room_id === parseInt(roomId));
      if (idx === -1) return false;
      cache.rooms[idx] = {
        ...cache.rooms[idx], ...updates,
        current_occupancy: updates.current_occupancy !== undefined ? parseInt(updates.current_occupancy) : cache.rooms[idx].current_occupancy,
        capacity: updates.capacity !== undefined ? parseInt(updates.capacity) : cache.rooms[idx].capacity,
        updated_at: new Date().toISOString()
      };
      saveRoom(cache.rooms[idx]);
      return true;
    },
    delete: (roomId) => {
      const before = cache.rooms.length;
      cache.rooms = cache.rooms.filter(r => r.room_id !== parseInt(roomId));
      if (cache.rooms.length < before) {
        deleteFromDB(Room, { room_id: parseInt(roomId) });
        return true;
      }
      return false;
    }
  },

  allocations: {
    find:    (fn) => fn ? cache.allocations.filter(fn) : [...cache.allocations],
    findOne: (fn) => cache.allocations.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('allocation_id');
      const obj = { allocation_id: id, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      cache.allocations.push(obj);
      saveAllocation(obj);
      return obj;
    },
    update: (allocId, updates) => {
      const idx = cache.allocations.findIndex(a => a.allocation_id === parseInt(allocId));
      if (idx === -1) return false;
      cache.allocations[idx] = { ...cache.allocations[idx], ...updates, updated_at: new Date().toISOString() };
      saveAllocation(cache.allocations[idx]);
      return true;
    },
    delete: (allocId) => {
      const before = cache.allocations.length;
      cache.allocations = cache.allocations.filter(a => a.allocation_id !== parseInt(allocId));
      if (cache.allocations.length < before) {
        deleteFromDB(Allocation, { allocation_id: parseInt(allocId) });
        return true;
      }
      return false;
    }
  },

  payments: {
    find:    (fn) => fn ? cache.payments.filter(fn) : [...cache.payments],
    findOne: (fn) => cache.payments.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('payment_id');
      const obj = { payment_id: id, ...data, amount: parseFloat(data.amount), created_at: new Date().toISOString() };
      cache.payments.push(obj);
      savePayment(obj);
      return obj;
    },
    update: (paymentId, updates) => {
      const idx = cache.payments.findIndex(p => p.payment_id === parseInt(paymentId));
      if (idx === -1) return false;
      cache.payments[idx] = {
        ...cache.payments[idx], ...updates,
        amount: updates.amount !== undefined ? parseFloat(updates.amount) : cache.payments[idx].amount
      };
      savePayment(cache.payments[idx]);
      return true;
    },
    delete: (paymentId) => {
      const before = cache.payments.length;
      cache.payments = cache.payments.filter(p => p.payment_id !== parseInt(paymentId));
      if (cache.payments.length < before) {
        deleteFromDB(Payment, { payment_id: parseInt(paymentId) });
        return true;
      }
      return false;
    }
  },

  auditLogs: {
    find:   (fn) => fn ? cache.audit_logs.filter(fn) : [...cache.audit_logs],
    insert: async (data) => {
      const id = await nextId('log_id');
      const obj = { log_id: id, ...data, created_at: new Date().toISOString() };
      cache.audit_logs.push(obj);
      saveAuditLog(obj);
      return obj;
    }
  },

  transferRequests: {
    find:    (fn) => fn ? cache.transfer_requests.filter(fn) : [...cache.transfer_requests],
    findOne: (fn) => cache.transfer_requests.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('request_id');
      const obj = { request_id: id, status: 'pending', ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      cache.transfer_requests.push(obj);
      saveTransferRequest(obj);
      return obj;
    },
    update: (reqId, updates) => {
      const idx = cache.transfer_requests.findIndex(r => r.request_id === parseInt(reqId));
      if (idx === -1) return false;
      cache.transfer_requests[idx] = { ...cache.transfer_requests[idx], ...updates, updated_at: new Date().toISOString() };
      saveTransferRequest(cache.transfer_requests[idx]);
      return true;
    },
    delete: (reqId) => {
      const before = cache.transfer_requests.length;
      cache.transfer_requests = cache.transfer_requests.filter(r => r.request_id !== parseInt(reqId));
      if (cache.transfer_requests.length < before) {
        deleteFromDB(TransferRequest, { request_id: parseInt(reqId) });
        return true;
      }
      return false;
    }
  },

  notices: {
    find:    (fn) => fn ? cache.notices.filter(fn) : [...cache.notices],
    findOne: (fn) => cache.notices.find(fn) || null,
    insert:  async (data) => {
      const id = await nextId('notice_id');
      const obj = { notice_id: id, ...data, created_at: new Date().toISOString() };
      cache.notices.push(obj);
      saveNotice(obj);
      return obj;
    },
    delete: (noticeId) => {
      const before = cache.notices.length;
      cache.notices = cache.notices.filter(n => n.notice_id !== parseInt(noticeId));
      if (cache.notices.length < before) {
        deleteFromDB(Notice, { notice_id: parseInt(noticeId) });
        return true;
      }
      return false;
    }
  },

  checkAndExpireLeases: () => {
    const nowStr = new Date().toISOString().split('T')[0];
    cache.allocations.forEach(alloc => {
      if (alloc.status === 'pending_payment' && alloc.lease_expires_at && nowStr > alloc.lease_expires_at) {
        alloc.status = 'cancelled';
        alloc.updated_at = new Date().toISOString();
        saveAllocation(alloc);

        const roomIdx = cache.rooms.findIndex(r => r.room_id === alloc.room_id);
        if (roomIdx !== -1) {
          cache.rooms[roomIdx].current_occupancy = Math.max(0, cache.rooms[roomIdx].current_occupancy - 1);
          cache.rooms[roomIdx].status = 'available';
          cache.rooms[roomIdx].updated_at = new Date().toISOString();
          saveRoom(cache.rooms[roomIdx]);
        }

        nextId('log_id').then(id => {
          const log = {
            log_id: id, user_id: null, action: 'LEASE_EXPIRED',
            table_name: 'allocations', record_id: alloc.allocation_id,
            details: `5-day unpaid lease expired for booking code ${alloc.booking_code}. Room released back to pool.`,
            created_at: new Date().toISOString()
          };
          cache.audit_logs.push(log);
          saveAuditLog(log);
        });
      }
    });
  }
};

// ─── Initialize & Seed ────────────────────────────────────────────────────────

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log(' Connected to MongoDB Atlas');
      await loadCache();
    } catch (err) {
      console.error('MongoDB Atlas connection failed, operating with in-memory data cache:', err.message);
    }
  } else {
    console.log('No MONGODB_URI provided, initializing in-memory database cache...');
  }

  // Seed admin user
  if (!cache.users.find(u => u.username === 'admin')) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.users.insert({ username: 'admin', password: hash, email: 'admin@hostel.com', full_name: 'Administrator', role: 'admin' });
    console.log(' Default admin seeded (admin / admin123)');
  }

  // Seed students (DISABLED per user request)
  /*
  if (cache.students.length === 0) {
    const studentHash = await bcrypt.hash('student123', 10);
    const samples = [
      { admission_number: 'ADM001', password: studentHash, gender: 'male',   full_name: 'John Kiprop',    email: 'john@example.com',   phone: '0712345678', course: 'Computer Science',  date_of_admission: '2024-01-10', next_of_kin_name: 'Mary Kiprop',    next_of_kin_phone: '0723456789', status: 'active' },
      { admission_number: 'ADM002', password: studentHash, gender: 'female', full_name: 'Grace Wambui',   email: 'grace@example.com',  phone: '0712345689', course: 'Business Studies', date_of_admission: '2024-02-15', next_of_kin_name: 'Joseph Wambui',  next_of_kin_phone: '0734567890', status: 'active' },
      { admission_number: 'ADM003', password: studentHash, gender: 'male',   full_name: 'Daniel Otieno',  email: 'daniel@example.com', phone: '0712345690', course: 'Engineering',       date_of_admission: '2024-03-20', next_of_kin_name: 'Rose Otieno',    next_of_kin_phone: '0745678901', status: 'active' }
    ];
    for (const s of samples) await db.students.insert(s);
    console.log(' Sample students seeded');
  }
  */

  // Seed & Ensure 50 rooms per block (Batian & Nelion, 2 beds each)
  const blocksConfig = [
    { blockName: 'Batian', prefix: 'BAT-', genderPolicy: 'male' },
    { blockName: 'Nelion', prefix: 'NEL-', genderPolicy: 'female' }
  ];

  const newRoomsToInsert = [];
  let maxRoomId = cache.rooms.reduce((max, r) => Math.max(max, r.room_id || 0), 0);

  for (const { blockName, prefix, genderPolicy } of blocksConfig) {
    for (let i = 1; i <= 50; i++) {
      const roomNumber = prefix + String(i).padStart(3, '0');
      const existing = cache.rooms.find(r => r.room_number === roomNumber);
      if (!existing) {
        maxRoomId++;
        newRoomsToInsert.push({
          room_id: maxRoomId,
          room_number: roomNumber,
          room_type: 'Double',
          capacity: 2,
          monthly_rate: 20000,
          price: 20000,
          current_occupancy: 0,
          status: 'available',
          floor: Math.ceil(i / 10),
          block_name: blockName,
          gender_restriction: genderPolicy,
          amenities: `${blockName} block hostel room (${genderPolicy} restriction)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (existing.capacity !== 2 || existing.room_type !== 'Double') {
        db.rooms.update(existing.room_id, { capacity: 2, room_type: 'Double' });
      }
    }
  }

  if (newRoomsToInsert.length > 0) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        await Room.insertMany(newRoomsToInsert);
        await Counter.findByIdAndUpdate('room_id', { seq: maxRoomId }, { upsert: true });
        console.log(` Batch seeded ${newRoomsToInsert.length} new rooms to MongoDB Atlas`);
        await loadCache();
      } catch (err) {
        cache.rooms.push(...newRoomsToInsert);
      }
    } else {
      cache.rooms.push(...newRoomsToInsert);
      console.log(` Seeded ${newRoomsToInsert.length} rooms to memory cache`);
    }
  }

  // Seed default notice using actual room numbers (DISABLED)
  /*
  if (cache.notices.length === 0) {
    await db.notices.insert({
      title: 'Batian Block Room Maintenance',
      message: 'Routine maintenance scheduled for Batian Block (Rooms BAT-001 to BAT-005) starting next Friday. Please contact hostel warden for details.',
      block_name: 'Batian',
      room_range: 'BAT-001 to BAT-005',
      posted_by: 'Admin'
    });
    console.log(' Seeded default hostel notice');
  }
  */

  // Seed sample allocations & payments if empty (DISABLED)
  /*
  if (cache.allocations.length === 0 && cache.students.length > 0) {
    const student1 = cache.students[0];
    const room1 = cache.rooms.find(r => r.room_number === 'BAT-001');
    if (student1 && room1) {
      await db.allocations.insert({
        student_id: student1.student_id,
        room_id: room1.room_id,
        allocation_date: new Date().toISOString().split('T')[0],
        status: 'active',
        booking_code: 'BK-SAMPLE1',
        full_name: student1.full_name,
        room_number: room1.room_number
      });
      db.rooms.update(room1.room_id, { current_occupancy: 1, status: 'reserved' });
    }
  }

  if (cache.payments.length === 0 && cache.students.length > 0) {
    const student1 = cache.students[0];
    if (student1) {
      await db.payments.insert({
        student_id: student1.student_id,
        amount: 20000,
        payment_method: 'mpesa',
        transaction_id: 'MPESA998822',
        status: 'completed',
        payment_date: new Date().toISOString().split('T')[0]
      });
    }
  }
  */

  console.log('MongoDB database initialization complete.');
}

module.exports = { db, initializeDatabase };
