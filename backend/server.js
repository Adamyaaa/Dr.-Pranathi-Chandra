require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test DB connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to Neon database:', err);
  } else {
    console.log('Successfully connected to Neon database at:', res.rows[0].now);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('Dr. Pranathi Chandra Clinic API is running');
});

// Book appointment endpoint
app.post('/api/book', async (req, res) => {
  const { name, phone, email, vtype, pday, psession, pnote } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const query = `
      INSERT INTO appointment_requests 
      (patient_name, phone_number, visit_type, preferred_date, preferred_session, symptoms_note) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *;
    `;
    
    // Handle empty date safely
    const parsedDate = pday ? pday : null;
    
    // Save email in the note field to avoid needing an immediate database schema change
    const combinedNote = email ? `Email: ${email}\n${pnote || ''}` : pnote;
    
    const values = [name, phone, vtype, parsedDate, psession, combinedNote];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({ 
      success: true, 
      message: 'Appointment request saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving appointment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
