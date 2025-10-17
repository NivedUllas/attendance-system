/*
 * Contactless Attendance Management with Face Detection
 * Author: Nived Ullas
 * GitHub: https://github.com/NivedUllas
 * Created: October 2025
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, name }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ userId: data.id, email: data.email }, JWT_SECRET);
    
    res.json({ 
      message: 'User registered successfully',
      token, 
      user: { id: data.id, name: data.name, email: data.email } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
    
    res.json({ 
      message: 'Login successful',
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/save-face', authenticateToken, async (req, res) => {
  try {
    const { name, rollNumber, faceDescriptor } = req.body;
    
    const { data: existingStudent } = await supabase
      .from('students')
      .select('roll_number')
      .eq('roll_number', rollNumber)
      .single();

    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }
    
    const { data, error } = await supabase
      .from('students')
      .insert([{ 
        user_id: req.user.userId, 
        name, 
        roll_number: rollNumber,
        face_descriptor: faceDescriptor 
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.json({ 
      message: 'Student registered successfully', 
      student: data 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/mark-attendance', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.body;
    
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', today);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Attendance already marked today' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert([{ student_id: studentId }])
      .select(`
        *,
        students (name, roll_number)
      `)
      .single();

    if (error) throw error;
    
    res.json({ 
      message: 'Attendance marked successfully', 
      attendance: data 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        students (name, roll_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'TensorFlow.js Attendance Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 TensorFlow.js Server running on port ${PORT}`);
});