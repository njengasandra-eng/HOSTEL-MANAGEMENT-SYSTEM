const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

// POST /api/login (Admin Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const cleanPassword = String(password).trim();

  try {
    const user = db.users.findOne(u => u.username === username.trim());

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Set session
    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.role = user.role;
    req.session.loginTime = Date.now();

    // Log action
    await db.auditLogs.insert({
      user_id: user.user_id,
      action: 'LOGIN',
      table_name: 'users',
      record_id: user.user_id,
      details: `Admin ${user.username} logged in successfully.`
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/student/login (Student Login)
router.post('/student/login', async (req, res) => {
  const { admission_number, password } = req.body;

  if (!admission_number || !password) {
    return res.status(400).json({ success: false, message: 'Admission number and password are required' });
  }

  const cleanPassword = String(password).trim();

  try {
    const student = db.students.findOne(s => s.admission_number.trim().toUpperCase() === admission_number.trim().toUpperCase());

    if (!student || student.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = student.student_id;
    req.session.username = student.admission_number;
    req.session.fullName = student.full_name;
    req.session.role = 'student';
    req.session.gender = student.gender;
    req.session.loginTime = Date.now();

    // Log action
    await db.auditLogs.insert({
      user_id: null, // Student is not admin, user_id foreign key refers to users table. So we keep it null.
      action: 'STUDENT_LOGIN',
      table_name: 'students',
      record_id: student.student_id,
      details: `Student ${student.admission_number} logged in.`
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: student.student_id,
        username: student.admission_number,
        name: student.full_name,
        role: 'student',
        gender: student.gender
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/student/register (Student self-registration)
router.post('/student/register', async (req, res) => {
  const {
    admission_number,
    password,
    full_name,
    email,
    phone,
    course,
    gender,
    next_of_kin_name,
    next_of_kin_phone
  } = req.body;

  if (!admission_number || !password || !full_name || !course || !gender) {
    return res.status(400).json({ success: false, message: 'Admission number, password, full name, course, and gender are required' });
  }

  const cleanPassword = String(password).trim();
  if (!cleanPassword) {
    return res.status(400).json({ success: false, message: 'Password cannot be empty or only spaces.' });
  }

  const phoneStr = String(phone || '').trim();
  if (phoneStr && !/^\+254[17][0-9]{8}$/.test(phoneStr)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
  }

  try {
    const existing = db.students.findOne(s => s.admission_number.toLowerCase() === admission_number.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admission number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const today = new Date().toISOString().split('T')[0];
    
    const newStudent = await db.students.insert({
      admission_number: admission_number.trim().toUpperCase(),
      password: hashedPassword,
      gender: gender.toLowerCase() === 'female' ? 'female' : 'male',
      full_name: full_name.trim(),
      email: (email || '').trim(),
      phone: phoneStr,
      course: course.trim(),
      date_of_admission: today,
      next_of_kin_name: (next_of_kin_name || '').trim(),
      next_of_kin_phone: (next_of_kin_phone || '').trim(),
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Student account created successfully. You can now log in.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/change-password (Admin — must be logged in)
router.post('/change-password', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }
  if (String(new_password).trim().length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  try {
    const user = db.users.findOne(u => u.user_id === req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await bcrypt.compare(String(current_password).trim(), user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(String(new_password).trim(), 10);
    // Update directly in the Mongoose model and the in-memory cache
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    await User.findOneAndUpdate({ user_id: user.user_id }, { password: hashed, updated_at: new Date().toISOString() });
    user.password = hashed; // Update cache so bcrypt compare works until next restart
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/admin/reset-password (Admin forgot password — verifies username exists then resets)
router.post('/admin/reset-password', async (req, res) => {
  const { username, new_password } = req.body;
  if (!username || !new_password) {
    return res.status(400).json({ success: false, message: 'Username and new password are required' });
  }
  if (String(new_password).trim().length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  try {
    const user = db.users.findOne(u => u.username === username.trim());
    if (!user) return res.status(404).json({ success: false, message: 'No admin account found with that username' });
    const hashed = await bcrypt.hash(String(new_password).trim(), 10);
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    await User.findOneAndUpdate({ user_id: user.user_id }, { password: hashed, updated_at: new Date().toISOString() });
    user.password = hashed; // Update in-memory cache
    res.json({ success: true, message: 'Admin password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/student/change-password (Student — must be logged in)
router.post('/student/change-password', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'student') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }
  if (String(new_password).trim().length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  try {
    const student = db.students.findOne(s => s.student_id === req.session.userId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const isMatch = await bcrypt.compare(String(current_password).trim(), student.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(String(new_password).trim(), 10);
    db.students.update(student.student_id, { password: hashed });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/student/reset-password (Forgot password — verify admission_number + full_name, then set new password)
router.post('/student/reset-password', async (req, res) => {
  const { admission_number, full_name, new_password } = req.body;
  if (!admission_number || !full_name || !new_password) {
    return res.status(400).json({ success: false, message: 'Admission number, full name, and new password are required' });
  }
  if (String(new_password).trim().length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  try {
    const student = db.students.findOne(s =>
      s.admission_number.toUpperCase() === admission_number.trim().toUpperCase() &&
      s.full_name.toLowerCase().trim() === full_name.trim().toLowerCase()
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student found with that admission number and name combination' });
    }
    const hashed = await bcrypt.hash(String(new_password).trim(), 10);
    db.students.update(student.student_id, { password: hashed });
    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  const role = req.session.role;
  const username = req.session.username;

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out' });
    }
    res.clearCookie('HOSTELSESSID');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me (Check session status)
router.get('/auth/me', (req, res) => {
  if (req.session.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        fullName: req.session.fullName,
        role: req.session.role,
        gender: req.session.gender
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

module.exports = router;
