require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Razorpay = require('razorpay');
const crypto = require('crypto');

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

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Test DB connection on startup and ensure payment columns exist
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Error connecting to Neon database:', err);
  } else {
    console.log('Successfully connected to Neon database at:', res.rows[0].now);
    try {
      await pool.query(`
        ALTER TABLE appointment_requests 
        ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
        ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
      `);
      console.log('Database payment columns verified successfully');
    } catch (migErr) {
      console.error('Error updating appointment_requests schema:', migErr);
    }
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

// Create Razorpay order endpoint
app.post('/api/create-order', async (req, res) => {
  const { appointment_id, amount } = req.body;

  if (!amount) {
    return res.status(400).json({ success: false, error: 'Amount is required' });
  }

  try {
    const options = {
      amount: Math.round(Number(amount) * 100), // Amount in paise
      currency: 'INR',
      receipt: `rcpt_${appointment_id || Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Save order ID to the appointment if appointment_id was provided
    if (appointment_id) {
      await pool.query(
        `UPDATE appointment_requests 
         SET razorpay_order_id = $1, amount_paid = $2, payment_status = 'pending' 
         WHERE id = $3`,
        [order.id, amount, appointment_id]
      );
    }

    res.json({
      success: true,
      order: order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// Verify payment signature endpoint
app.post('/api/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Missing payment details' });
  }

  try {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      await pool.query(
        `UPDATE appointment_requests 
         SET razorpay_payment_id = $1, payment_status = 'paid' 
         WHERE razorpay_order_id = $2 OR id = $3`,
        [razorpay_payment_id, razorpay_order_id, appointment_id || 0]
      );

      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
