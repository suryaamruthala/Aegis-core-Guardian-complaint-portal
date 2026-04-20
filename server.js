require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();

// Security Middleware
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow images to be viewed
app.use(cors());
app.use(express.json());

// Set up image uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});
const upload = multer({ storage: storage });

// Database Connection
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME || 'police_portal'
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groqChat = async (messages) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.3, max_tokens: 800 })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
};

// --- AUTHENTICATION ---
const JWT_SECRET = process.env.JWT_SECRET;

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)', 
            [name, email, phone, hashedPassword, role || 'citizen']);
        res.json({ success: true, message: 'User registered successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Handle explicit admin fallback for testing without DB setup
        if (email === 'admin' && password === 'police@2026') {
            const token = jwt.sign({ id: 0, role: 'admin', name: 'Admin Fallback' }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ success: true, token, user: { name: 'Admin', role: 'admin' } });
        }

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
        
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        res.json({ success: true, token, user: { name: user.name, role: user.role, email: user.email } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid Token' });
    }
};

// Audit Log Helper
const logAction = async (action, entity_type, entity_id, actor, actor_role, details, ip_address) => {
    try {
        await db.query('INSERT INTO audit_log (action, entity_type, entity_id, actor, actor_role, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [action, entity_type, entity_id, actor, actor_role, JSON.stringify(details), ip_address]);
    } catch (e) {
        console.error('Audit Log Error:', e);
    }
};

// --- FILE UPLOADS ---
app.post('/api/upload', upload.single('evidence'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// --- AI INTEGRATION ---
app.post('/analyze', async (req, res) => {
  try {
    const { complaint } = req.body;
    const text = await groqChat([{
      role: 'user',
      content: `You are a police FIR assistant. Analyze this complaint and reply in strict JSON only, no markdown formatting or backticks:
{
  "category": "crime category in short English (e.g. Theft, Assault, Cybercrime, Fraud)",
  "priority": "High or Medium or Low",
  "ipc_section": "relevant IPC section number and name",
  "summary": "formal legal 2 sentence summary",
  "recommended_action": "what police should do first",
  "area": "extract location/area name. Default to Central City if missing.",
  "sentiment": "Negative, Neutral, or Highly Agitated",
  "sentiment_score": "float from 0.0 to 1.0 (1.0 being extremely severe/dangerous)"
}
Complaint: ${complaint}`
    }]);
    
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(clean);
    
    // Auto-assign nearest officer based on AI extracted area (simplified logic)
    const [officers] = await db.query('SELECT * FROM officers WHERE active = true');
    let assigned = officers.find(o => o.area.toLowerCase() === data.area.toLowerCase());
    if(!assigned) assigned = officers[0] || { name: 'SI Ramesh Kumar', badge_no: 'AP-1001', station: 'Central Town PS' };

    data.assigned_officer = assigned.name;
    data.badge_no = assigned.badge_no;
    data.station = assigned.station;
    data.duplicate_risk = 'Low'; // Simple placeholder for duplicate checking logic
    
    res.json(data);
  } catch (error) {
    console.log('ERROR Analysis:', error.message);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await groqChat([{
      role: 'system',
      content: `You are a helpful police assistant for City Police Department. 
      Answer questions about filing FIR, police procedures, emergency contacts, and legal rights.
      You can respond in Telugu, Hindi, or English based on what language the user writes in. Keep it concise.`
    }, {
      role: 'user',
      content: message
    }]);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ reply: 'Sorry, unable to connect. Please call 100 for emergency!' });
  }
});

// --- COMPLAINTS API ---
app.post('/api/complaints', async (req, res) => {
  try {
    const { id, name, phone, address, complaint, category, priority, ipc_section, summary, recommended_action, area, officer, badgeNo, station, date, status, filedBy, sentiment, sentiment_score, evidence_path } = req.body;
    
    await db.query(`INSERT INTO complaints (id, name, phone, address, complaint, category, priority, ipc_section, summary, recommended_action, area, officer, badge_no, station, date, status, filedBy, sentiment, sentiment_score, assigned_officer, duplicate_risk, evidence_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, name||'', phone||'', address||'', complaint||'', category||'', priority||'', ipc_section||'', summary||'', recommended_action||'', area||'', officer||'', badgeNo||'', station||'', date||'', status||'Pending Approval', filedBy||'citizen', sentiment||'Neutral', sentiment_score||0.5, officer||'', 'Low', evidence_path||'']);
    
    logAction('CREATE_COMPLAINT', 'complaints', id, name, 'citizen', { category }, req.ip);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    // Add pagination and filter support
    let { status, page = 1, limit = 50 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM complaints';
    let params = [];
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    
    // Get total count for pagination
    const [countRows] = await db.query('SELECT COUNT(*) as total FROM complaints');
    const total = countRows[0].total;

    res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    // Fallback if schema is missing columns
    res.status(500).json({ error: error.message, data: [], total: 0 });
  }
});

app.put('/api/complaints/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE complaints SET status = ? WHERE id = ?', [status, req.params.id]);
    
    logAction('UPDATE_STATUS', 'complaints', req.params.id, req.user.name, req.user.role, { new_status: status }, req.ip);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SOS ALERTS ---
app.post('/api/sos', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const [result] = await db.query('INSERT INTO sos_alerts (latitude, longitude, active) VALUES (?, ?, true)', [latitude, longitude]);
    logAction('SOS_TRIGGERED', 'sos_alerts', result.insertId, 'anonymous', 'citizen', { lat: latitude, lng: longitude }, req.ip);
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sos_alerts WHERE active = true ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sos/history', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sos_alerts ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sos/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await db.query('UPDATE sos_alerts SET latitude = ?, longitude = ? WHERE id = ? AND active = true', [latitude, longitude, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sos/:id/resolve', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE sos_alerts SET active = false WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sos/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM sos_alerts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log('✅ Secure Aegis Core Backend running on port 5000'));