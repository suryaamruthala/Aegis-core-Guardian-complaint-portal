import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import jsPDF from 'jspdf';
import 'leaflet/dist/leaflet.css';

/* =====================================================
   AEGIS CORE — ARCHITECT OF TRUST
   Guardian Complaint Portal | City Police
   All fully implemented features: PDF, AI, Map, DB Auth
   ===================================================== */

// --- Fix Leaflet Default Icon Issue in React ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============ HELPER FUNCTIONS ============
const priorityChipClass = (p) =>
  p === 'High' ? 'chip chip-high' : p === 'Medium' ? 'chip chip-medium' : 'chip chip-low';

const statusChipClass = (s) => {
  if (s === 'Resolved')            return 'chip chip-resolved';
  if (s === 'Under Investigation') return 'chip chip-investigation';
  if (s === 'FIR Filed')           return 'chip chip-filed';
  if (s === 'Pending Approval')    return 'chip chip-pending';
  if (s === 'Rejected')            return 'chip chip-rejected';
  return 'chip chip-info';
};

const sentimentChipClass = (s) => {
  if (s === 'Highly Agitated' || s === 'Negative') return 'chip chip-high';
  if (s === 'Positive') return 'chip chip-low';
  return 'chip chip-info';
};

const API_BASE = 'http://localhost:5000/api';
const ROOT_BASE = 'http://localhost:5000';

// ============ TOAST SYSTEM ============
let toastCount = 0;
const ToastContainer = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.type}`}>
        <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
        {t.message}
      </div>
    ))}
  </div>
);

// ============ SOS BUTTON ============
function SOSButton({ showToast }) {
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [firGenerated, setFirGenerated] = useState(false);
  const emergencyFirId = 'SOS-2026-' + Math.floor(Math.random() * 9000 + 1000);
  const watchIdRef = useRef(null);

  const closeSOS = () => {
    setSosActive(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const activateSOS = () => {
    setSosActive(true); setCountdown(3); setFirGenerated(false);
    let count = 3;
    const timer = setInterval(() => {
      count -= 1; setCountdown(count);
      if (count === 0) {
        clearInterval(timer);
        setFirGenerated(true);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const res = await fetch(`${API_BASE}/sos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude })
              });
              const data = await res.json();
              if(res.ok) {
                showToast('Emergency signal broadcasted!', 'success');
                if (data.id) {
                  watchIdRef.current = navigator.geolocation.watchPosition(async (newPos) => {
                    await fetch(`${API_BASE}/sos/${data.id}/location`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ latitude: newPos.coords.latitude, longitude: newPos.coords.longitude })
                    });
                  }, (err) => console.log(err), { enableHighAccuracy: true });
                }
              }
            } catch (e) {
                showToast('Failed to reach servers. Call 100 immediately!', 'error');
            }
          });
        }
      }
    }, 1000);
  };

  if (sosActive) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: firGenerated ? 'rgba(25,28,30,0.85)' : 'rgba(186,26,26,0.15)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1.5rem', backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          background: 'var(--surface)', borderRadius: '3rem', padding: '3rem',
          maxWidth: '420px', width: '90%', textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {!firGenerated ? (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🚨</div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--error)', marginBottom: '0.25rem' }}>SOS ACTIVATED</div>
              <div style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--error)', lineHeight: 1 }}>{countdown}</div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', margin: '0.75rem 0 1.5rem' }}>Notifying Nearest Police Station...</div>
              <button onClick={closeSOS} className="btn-ghost">Cancel</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginBottom: '1rem' }}>Police Notified!</div>
              <div style={{ background: 'var(--surface-container-low)', borderRadius: '1.5rem', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Emergency FIR Generated</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '2px', marginBottom: '0.75rem' }}>{emergencyFirId}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  <div>🚔 Nearest Unit: Central Town PS</div>
                  <div>👮 Officer: SI Ramesh Kumar</div>
                  <div>📍 Location: Live Tracking Active</div>
                  <div>⏱️ ETA: 8–10 minutes</div>
                </div>
              </div>
              <button onClick={closeSOS} className="btn-primary">Close</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <button onClick={activateSOS} style={{
      position: 'fixed', bottom: '110px', right: '30px',
      width: '64px', height: '64px', borderRadius: '50%',
      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      border: '3px solid #fff', color: '#fff',
      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(185,28,28,0.45)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px'
    }}>
      🆘<span style={{ fontSize: '10px' }}>SOS</span>
    </button>
  );
}

// ============ AI CHATBOT ============
function Chatbot({ showToast }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'నమస్కారం! Hello! मैं City Police AI Assistant हूं। How can I help you? 👮' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setInput(''); setLoading(true);
    try {
      const response = await fetch(`${ROOT_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, connection failed.' }]);
    }
    setLoading(false);
  };

  const quickQuestions = ['How to file FIR?', 'FIR ఎలా వేయాలి?', 'Emergency number?', 'What documents needed?'];

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: '30px', right: '30px',
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
        border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer',
        boxShadow: 'var(--shadow-floating)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 300ms ease'
      }}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '100px', right: '30px',
          width: '360px', height: '520px',
          background: 'var(--surface)', borderRadius: '2rem',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            padding: '1.125rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
            }}>👮</div>
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: '#fff' }}>Police AI Assistant</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
                Online — Telugu / Hindi / English
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--background)' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '0.625rem 0.875rem',
                  borderRadius: msg.from === 'user' ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                  background: msg.from === 'user' ? 'linear-gradient(135deg, var(--primary), var(--primary-container))' : 'var(--surface-container-lowest)',
                  color: msg.from === 'user' ? 'var(--on-primary)' : 'var(--on-surface)',
                  fontSize: '0.875rem', lineHeight: 1.5,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'var(--surface-container-lowest)', padding: '0.625rem 0.875rem',
                  borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem',
                  color: 'var(--on-surface-variant)', fontSize: '0.875rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>🤖 Typing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div style={{ padding: '0.5rem 0.875rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap', background: 'var(--surface-container-lowest)', borderTop: '1px solid var(--surface-container)' }}>
            {quickQuestions.map((q, i) => (
              <button key={i} onClick={() => setInput(q)} className="pill-tab" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-container-lowest)' }}>
            <input
              style={{
                flex: 1, padding: '0.625rem 1rem',
                borderRadius: '999px', border: 'none',
                background: 'var(--surface-container-low)', color: 'var(--on-surface)', fontSize: '0.875rem', outline: 'none'
              }}
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              border: 'none', color: '#fff', cursor: 'pointer',
              fontSize: '1rem'
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

// ============ RECHARTS ANALYTICS ============
function AnalyticsCharts({ complaints }) {
  const categoryData = {};
  const dailyData = {};
  const priorityData = { High: 0, Medium: 0, Low: 0 };

  complaints.forEach(c => {
    categoryData[c.category] = (categoryData[c.category] || 0) + 1;
    if (priorityData[c.priority] !== undefined) priorityData[c.priority]++;
    
    // Attempt to extract date component
    let dateStr = c.date;
    if (c.created_at) {
        dateStr = new Date(c.created_at).toLocaleDateString();
    }
    const day = dateStr?.substring(0, 5) || 'Unknown';
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

  const catFormatted = Object.entries(categoryData).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0, 5);
  const lineFormatted = Object.entries(dailyData).slice(-10).map(([date, count]) => ({ date, count })); // Last 10 days
  const priFormatted = Object.entries(priorityData).map(([name, value]) => ({ name, value }));

  const COLORS = ['#001e42', '#103360', '#515f74', '#b91c1c', '#15803d'];

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* PIE CHART */}
        <div className="card-sm animate-in">
          <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Top Crime Categories</div>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={catFormatted} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {catFormatted.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: 'var(--shadow-floating)', background: 'var(--surface-container-lowest)' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART */}
        <div className="card-sm animate-in">
          <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Priority Breakdown</div>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={priFormatted}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--on-surface-variant)'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: 'var(--on-surface-variant)'}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'var(--surface-container-low)'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: 'var(--shadow-floating)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#b91c1c" />
                    <Cell fill="#d97706" />
                    <Cell fill="#15803d" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* AREA CHART */}
      <div className="card-sm animate-in">
        <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Daily Complaint Trend</div>
        <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
                <AreaChart data={lineFormatted}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--on-surface-variant)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: 'var(--on-surface-variant)'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: 'var(--shadow-floating)' }} />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============ NAVBAR ============
function Navbar({ page, setPage, user, onLogout, toggleDarkMode, isDark }) {
  const tabs = [
    { id: 'citizen', label: 'File Complaint', icon: '📝' },
    { id: 'status',  label: 'Track Status',   icon: '🔍' },
    { id: 'heatmap', label: 'Crime Heatmap',  icon: '🗺️' },
  ];
  if(user?.role === 'admin' || user?.role === 'officer') {
    tabs.push({ id: 'dashboard', label: 'Dashboard', icon: '🛡️' });
  }

  return (
    <header className="glass" style={{
      position: 'sticky', top: 0, zIndex: 500,
      borderBottom: '1px solid var(--outline-variant)'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '0.875rem 2rem',
        maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setPage('citizen')}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            borderRadius: '1rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0, color: 'white'
          }}>🛡️</div>
          <div>
            <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.0625rem', color: 'var(--primary)', letterSpacing: '-0.01em' }}>Aegis Core</div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>Guardian Complaint Portal</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="pill-tabs">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setPage(t.id)}
                className={`pill-tab${page === t.id ? ' active' : ''}`}>
                {t.icon} <span className="hide-mobile">{t.label}</span>
              </button>
            ))}
          </div>
          
          <button onClick={toggleDarkMode} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%', width: 40, height: 40 }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {user ? (
            <button onClick={onLogout} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>🚪 Logout</button>
          ) : (
            <button onClick={() => setPage('login')} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>🔐 Login</button>
          )}
        </nav>
      </div>
      <div className="gradient-band" style={{ height: '3px' }} />
    </header>
  );
}

// ============ CITIZEN/OFFICER FORM ============
// Merged logic to handle file uploads, OCR potential, voice playback
function ComplaintForm({ onComplaintFiled, user, showToast, setPage }) {
  const [language, setLanguage]         = useState('english');
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [address, setAddress]           = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [evidenceFile, setEvidenceFile]   = useState(null);
  const [previewURL, setPreviewURL]     = useState(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [firDraft, setFirDraft]         = useState(null);
  const [isListening, setIsListening]   = useState(false);
  
  const isOfficer = user?.role === 'officer' || user?.role === 'admin';

  const labels = {
    english: { title: 'File New Complaint', submit: 'Submit & Generate AI FIR' },
    telugu:  { title: 'కొత్త ఫిర్యాదు చేయండి', submit: 'సమర్పించు & AI FIR రూపొందించు' },
    hindi:   { title: 'नई शिकायत दर्ज करें', submit: 'सबमिट करें और AI FIR बनाएं' },
  };
  const t = labels[language];

  // Voice Input (Speech to Text)
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('Voice not supported! Use Chrome.', 'error'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'telugu' ? 'te-IN' : language === 'hindi' ? 'hi-IN' : 'en-IN';
    recognition.start(); setIsListening(true);
    recognition.onresult = (e) => { setComplaintText(prev => prev + ' ' + e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);
  };

  // Voice Playback (Text to Speech)
  const speakSynthesis = (text) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      synth.speak(utterance);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        setEvidenceFile(file);
        setPreviewURL(URL.createObjectURL(file));
        showToast('Evidence attached.', 'info');
        // OCR could go here: Tesseract.recognize(file).then({data: {text}} => setComplaintText(text))
    }
  };

  // Export to PDF function using jsPDF
  const exportPDF = (draft) => {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(0, 30, 66);
      doc.text("Official Initial Information Report (FIR)", 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`FIR Number: ${draft.id}`, 20, 30);
      doc.text(`Date: ${draft.date}`, 20, 40);
      doc.text(`Complainant Name: ${draft.name}`, 20, 50);
      doc.text(`Phone: ${draft.phone}`, 20, 60);
      doc.text(`Incident Area: ${draft.area}`, 20, 70);
      
      doc.text(`Category: ${draft.category}`, 20, 90);
      doc.text(`IPC Section: ${draft.ipc_section}`, 20, 100);
      doc.text(`Priority: ${draft.priority}`, 20, 110);
      
      doc.text(`Summary:`, 20, 130);
      const splitSummary = doc.splitTextToSize(draft.summary, 170);
      doc.text(splitSummary, 20, 140);
      
      const newY = 140 + splitSummary.length * 10;
      doc.text(`Recommended Action:`, 20, newY);
      const splitAction = doc.splitTextToSize(draft.recommended_action || "Pending", 170);
      doc.text(splitAction, 20, newY + 10);
      
      doc.save(`${draft.id}.pdf`);
  };

  const handleSubmit = async () => {
    if (!name || !complaintText) { showToast('Name and Complaint are required!', 'error'); return; }
    setIsAnalyzing(true); setFirDraft(null);

    try {
      // 1. Upload evidence if any
      let evidence_path = '';
      if (evidenceFile) {
          const formData = new FormData();
          formData.append('evidence', evidenceFile);
          const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if(uploadData.url) evidence_path = uploadData.url;
      }

      // 2. AI Analysis
      const response = await fetch(`${ROOT_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: complaintText })
      });
      const aiResult = await response.json();
      
      const newFir = {
        id: 'FIR-2026-' + Math.floor(Math.random() * 9000 + 1000),
        name, phone, address, complaint: complaintText,
        category: aiResult.category, priority: aiResult.priority,
        ipc_section: aiResult.ipc_section, summary: aiResult.summary,
        recommended_action: aiResult.recommended_action,
        area: aiResult.area || 'Central City',
        date: new Date().toLocaleDateString(),
        status: isOfficer ? 'FIR Filed' : 'Pending Approval', 
        filedBy: isOfficer ? 'officer' : 'citizen',
        officer: isOfficer ? user.name : aiResult.assigned_officer,
        badgeNo: isOfficer ? 'Self' : aiResult.badge_no,
        station: isOfficer ? 'Headquarters' : aiResult.station,
        sentiment: aiResult.sentiment,
        sentiment_score: aiResult.sentiment_score,
        evidence_path
      };

      // 3. Save to DB
      await fetch(`${API_BASE}/complaints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFir)
      });

      onComplaintFiled(newFir); 
      setFirDraft(newFir);
      showToast(isOfficer ? 'Official FIR Filed!' : 'Complaint submitted for approval.', 'success');
      
      // Auto-playback summary
      if(language === 'english') speakSynthesis("FIR preview generated. " + newFir.summary);

    } catch (e) { 
        showToast('Submission failed. Check connection.', 'error'); 
        console.error(e);
    }
    setIsAnalyzing(false);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1.25rem' }} className="animate-in">
      <div className={isOfficer ? "alert-warning" : "alert-info"}>
        {isOfficer ? "👮 Officer Mode — FIR is filed directly to records without approval." : "👤 Citizen Portal — Complaints require officer approval."}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div className="pill-tabs">
          {[['english', 'English'], ['telugu', 'తెలుగు'], ['hindi', 'हिंदी']].map(([lang, label]) => (
            <button key={lang} onClick={() => setLanguage(lang)} className={`pill-tab${language === lang ? ' active' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {!firDraft ? (
        <div className="card">
          <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>{t.title}</h2>

          <input className="input-field" placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input className="input-field" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
            <input className="input-field" placeholder="Location/Area" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <textarea className="input-field" placeholder="Describe the incident in your language... *" value={complaintText} onChange={e => setComplaintText(e.target.value)} rows={5} />

          <button onClick={startVoice} className="btn-secondary" style={{ width: '100%', marginBottom: '1rem', background: isListening ? 'var(--error-container)' : '' }}>
            {isListening ? '🔴 Listening... Speak Now!' : '🎤 Voice Input'}
          </button>

          <div style={{
            border: '2px dashed var(--outline-variant)', borderRadius: 'var(--radius-md)', 
            padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer'
          }}>
            <input type="file" accept="image/*,application/pdf" onChange={handleImageUpload} style={{ display: 'none' }} id="upload" />
            <label htmlFor="upload" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }}>📎 Upload Evidence Photo/Doc</label>
            {previewURL && <img src={previewURL} alt="evidence" style={{ width: '100%', marginTop: '1rem', borderRadius: '1rem', maxHeight: '200px', objectFit: 'contain' }} />}
          </div>

          <button onClick={handleSubmit} disabled={isAnalyzing} className={isOfficer ? "btn-danger" : "btn-primary"}>
            {isAnalyzing ? `🤖 Processing AI...` : `🤖 ${t.submit}`}
          </button>
        </div>
      ) : (
        <div className="fir-print card animate-in" style={{ marginTop: '2rem', border: '2px solid var(--outline-variant)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{isOfficer ? '✅' : '⏳'}</div>
            <div className="headline-sm">{isOfficer ? 'Official FIR Filed' : 'Pending Approval'}</div>
          </div>

          <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>Complaint Number</div>
            <div className="display-sm" style={{ color: 'var(--primary)' }}>{firDraft.id}</div>
          </div>

          {[['Complainant', firDraft.name], ['Incident Area', firDraft.area], ['Category', firDraft.category], ['IPC Section', firDraft.ipc_section], ['Assigned Officer', firDraft.officer]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container)' }}>
              <span className="label-lg">{l}</span>
              <span className="body-md">{v}</span>
            </div>
          ))}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span className="label-lg">Priority</span>
            <span className={priorityChipClass(firDraft.priority)}>{firDraft.priority}</span>
          </div>

          <div style={{ padding: '1rem 0' }}>
            <div className="label-lg" style={{ marginBottom: '0.5rem' }}>AI Summary</div>
            <p className="body-md">{firDraft.summary}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <button className="no-print btn-secondary" onClick={() => speakSynthesis(firDraft.summary)}>🔊 Read Aloud</button>
            <button className="no-print btn-primary" onClick={() => exportPDF(firDraft)}>📄 Export PDF</button>
          </div>
          {!isOfficer && (
             <button onClick={() => setPage('status')} className="btn-ghost no-print" style={{ width: '100%', marginTop: '1rem' }}>🔍 Track Status</button>
          )}
        </div>
      )}
    </div>
  );
}

// ============ TIMELINE & STATUS PAGE ============
function StatusPage({ dbComplaints, showToast }) {
  const [firId, setFirId]   = useState('');
  const [result, setResult] = useState(null);

  const track = () => {
    const found = dbComplaints.find(c => c.id.toLowerCase() === firId.toLowerCase());
    if (found) { setResult(found); }
    else showToast('FIR not found. Provide a valid ID.', 'error');
  };

  // Timeline UI generator based on status
  const getTimelineSteps = (status) => {
    const steps = [
        { label: 'Submitted', done: true },
        { label: 'Approved', done: ['FIR Filed', 'Under Investigation', 'Resolved'].includes(status) },
        { label: 'Investigating', done: ['Under Investigation', 'Resolved'].includes(status) },
        { label: 'Resolved', done: status === 'Resolved' }
    ];
    if (status === 'Rejected') return [{label: 'Submitted', done: true}, {label: 'Rejected', done: true, fail:true}];
    return steps;
  }

  return (
    <div style={{ maxWidth: '560px', margin: '3rem auto', padding: '0 1.25rem' }} className="animate-in">
      <div className="card">
        <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Track Complaint</h2>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Enter FIR ID</p>
        
        <input className="input-field" placeholder="e.g. FIR-2026-1001" value={firId} onChange={e => setFirId(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()} />
        <button onClick={track} className="btn-primary">🔍 Track Status</button>

        {result && (
          <div style={{ marginTop: '2rem' }} className="animate-in">
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div className="headline-sm" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{result.id}</div>
              
              {/* Timeline graphic */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '4px', background: 'var(--surface-container-highest)', zIndex: 0 }} />
                {getTimelineSteps(result.status).map((step, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                        width: 28, height: 28, borderRadius: '50%', 
                        background: step.fail ? 'var(--error)' : step.done ? 'var(--primary)' : 'var(--surface-container-highest)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                    }}>
                        {step.fail ? '✕' : step.done ? '✓' : ''}
                    </div>
                    <span className="label-sm" style={{ marginTop: '8px', color: step.done ? 'var(--on-surface)' : 'var(--outline)' }}>{step.label}</span>
                  </div>
                ))}
              </div>

              {[
                ['Complainant', result.name], ['Area', result.area], ['Officer', result.officer]
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span className="label-lg">{l}</span>
                  <span className="body-sm">{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid var(--outline-variant)' }}>
                <span className="label-lg">Status</span>
                <span className={statusChipClass(result.status)}>{result.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ AUTHENTICATION PAGES ============
function AuthPage({ onAuthSuccess, showToast }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async () => {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });
            const data = await res.json();
            if (data.success) {
                if (data.token) {
                    localStorage.setItem('aegis_token', data.token);
                    onAuthSuccess(data.user);
                    showToast(`Welcome back, ${data.user.name}`, 'success');
                } else {
                    showToast('Registered! Please log in.', 'success');
                    setIsLogin(true);
                }
            } else {
                showToast(data.error, 'error');
            }
        } catch (e) {
            showToast('Authentication failed', 'error');
        }
    };

    return (
        <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '0 1.25rem' }} className="animate-in">
            <div className="card">
                <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                    {isLogin ? 'Secure Gateway' : 'Citizen Registration'}
                </h2>
                <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                    {isLogin ? 'Authenticate to access command center.' : 'Create an account to track complaints.'}
                </p>

                {!isLogin && <input className="input-field" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} />}
                <input className="input-field" placeholder="Email (admin or user email)" value={email} onChange={e=>setEmail(e.target.value)} />
                <input className="input-field" type="password" placeholder="Password (police@2026)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSubmit()} />

                <button onClick={handleSubmit} className="btn-primary">
                    {isLogin ? '🔐 Authorize' : '📝 Register'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button onClick={() => setIsLogin(!isLogin)} className="btn-ghost" style={{ border: 'none' }}>
                        {isLogin ? 'Create an account' : 'Already registered?'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ ADMIN DASHBOARD ============
function Dashboard({ showToast }) {
  const [complaints, setComplaints] = useState([]);
  const [activeSos, setActiveSos] = useState([]);
  const [sosHistory, setSosHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    let url = `${API_BASE}/complaints?page=${page}&limit=10`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setComplaints(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) { showToast('Load error', 'error'); }
    setLoading(false);
  }, [page, statusFilter, showToast]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  useEffect(() => {
    const fetchActiveSos = async () => {
      try {
        const res = await fetch(`${API_BASE}/sos`);
        const data = await res.json();
        if(Array.isArray(data)) setActiveSos(data);
      } catch(e){}
    };
    const fetchSosHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/sos/history`);
        const data = await res.json();
        if(Array.isArray(data)) setSosHistory(data);
      } catch(e){}
    };
    fetchActiveSos();
    fetchSosHistory();
    const interval = setInterval(() => { fetchActiveSos(); fetchSosHistory(); }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveSos = async (id) => {
    try {
      const token = localStorage.getItem('aegis_token');
      await fetch(`${API_BASE}/sos/${id}/resolve`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('SOS Alarm Resolved', 'success');
    } catch(e) {}
  };

  const handleDeleteSos = async (id) => {
    if(!window.confirm('Are you sure you want to completely delete this SOS record? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('aegis_token');
      await fetch(`${API_BASE}/sos/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('SOS Record Deleted', 'success');
    } catch(e) {
      showToast('Deletion failed', 'error');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('aegis_token');
      await fetch(`${API_BASE}/complaints/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      showToast('Status updated', 'success');
      fetchComplaints();
    } catch (e) { showToast('Update failed', 'error'); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2.5rem auto', padding: '0 1.5rem' }} className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="display-sm" style={{ color: 'var(--primary)' }}>Command Center</h1>
        <p className="body-lg" style={{ color: 'var(--on-surface-variant)' }}>City Police Dashboard</p>
      </div>

      <AnalyticsCharts complaints={complaints} />

      {/* ACTIVE SOS ALERTS */}
      {activeSos.length > 0 && (
        <div className="card-sm" style={{ marginBottom: '2rem', border: '2px solid var(--error)' }}>
          <div className="section-header">
            <h3 className="title-lg" style={{ color: 'var(--error)' }}>🚨 ACTIVE SOS ALARMS ({activeSos.length})</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {activeSos.map(sos => (
              <div key={sos.id} style={{ background: 'var(--error-container)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--on-error-container)' }}>SOS ID: {sos.id}</strong>
                  <span className="live-badge"><span className="live-dot"/>LIVE Tracking</span>
                </div>
                <div style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--on-error-container)' }}>
                  Started: {new Date(sos.timestamp).toLocaleTimeString()}<br/>
                  Location: {Number(sos.latitude || 0).toFixed(4)}, {Number(sos.longitude || 0).toFixed(4)}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '0.625rem', fontSize: '0.875rem' }}>
                    📍 Navigate
                  </a>
                  <button onClick={() => handleResolveSos(sos.id)} className="btn-secondary" style={{ padding: '0.625rem', fontSize: '0.875rem', background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}>
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    {/* SOS HISTORY */}
    <div className="card-sm" style={{ marginBottom: '2rem' }}>
      <div className="section-header">
        <h3 className="title-lg">SOS History</h3>
        <div className="label-lg" style={{ color: 'var(--success)', fontWeight: 'bold' }}>
          Total Resolved: {sosHistory.filter(s => !s.active).length}
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
        <table className="aegis-table">
          <thead>
            <tr>
              <th>SOS ID</th>
              <th>Timestamp</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sosHistory.map(sos => (
              <tr key={`history-${sos.id}`}>
                <td><div className="label-lg" style={{ color: 'var(--primary)' }}>{sos.id}</div></td>
                <td><div className="body-sm">{new Date(sos.timestamp).toLocaleString()}</div></td>
                <td><div className="body-sm">{Number(sos.latitude || 0).toFixed(4)}, {Number(sos.longitude || 0).toFixed(4)}</div></td>
                <td>
                  <span className={sos.active ? "live-badge" : "chip chip-resolved"} style={sos.active ? { fontSize: '0.7rem' } : { padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>
                    {sos.active ? "ACTIVE" : "Resolved"}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleDeleteSos(sos.id)} className="btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--error)', color: 'var(--error)' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sosHistory.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No SOS history available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* FILTER & TABLE */}
    <div className="card-sm">
        <div className="section-header">
          <h3 className="title-lg">Recent Complaints</h3>
          <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setPage(1);}} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
             <option value="">All Statuses</option>
             <option value="Pending Approval">Pending</option>
             <option value="Under Investigation">Investigating</option>
             <option value="Resolved">Resolved</option>
          </select>
        </div>
        
        {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Data...</div>
        ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="aegis-table">
                <thead>
                <tr>
                    <th>ID / Complainant</th>
                    <th>Intelligence</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {complaints.map(c => (
                    <tr key={c.id}>
                    <td>
                        <div className="label-lg" style={{ color: 'var(--primary)' }}>{c.id}</div>
                        <div className="body-sm">{c.name}</div>
                        <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>{new Date(c.created_at || c.date).toLocaleDateString()}</div>
                    </td>
                    <td>
                        <span className={sentimentChipClass(c.sentiment)} style={{ marginRight: '0.5rem' }}>{c.sentiment || 'Neutral'}</span>
                        <span className={priorityChipClass(c.priority)}>{c.priority}</span>
                        <div className="label-sm" style={{ marginTop: '0.25rem' }}>Assignee: {c.assigned_officer || c.officer}</div>
                    </td>
                    <td><span className={statusChipClass(c.status)}>{c.status}</span></td>
                    <td>
                        {c.status === 'Pending Approval' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleUpdateStatus(c.id, 'Under Investigation')} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Approve</button>
                                <button onClick={() => handleUpdateStatus(c.id, 'Rejected')} className="btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--error)', color: 'var(--error)' }}>Reject</button>
                            </div>
                        ) : c.status === 'Under Investigation' ? (
                            <button onClick={() => handleUpdateStatus(c.id, 'Resolved')} className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Resolve</button>
                        ) : null}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button disabled={page === 1} onClick={() => setPage(p=>p-1)} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>Prev</button>
            <span style={{ alignSelf: 'center' }} className="label-lg">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p=>p+1)} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>Next</button>
        </div>
      </div>
    </div>
  );
}

// ============ LEAFLET INTERACTIVE MAP ============
function HeatmapPage({ complaints }) {
    const [liveSos, setLiveSos] = useState([]);

    useEffect(() => {
        const fetchSos = async () => {
            try {
                const res = await fetch(`${API_BASE}/sos`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLiveSos(data);
                } else {
                    console.error("SOS API returned non-array:", data);
                }
            } catch (e) {}
        };
        fetchSos();
        const interval = setInterval(fetchSos, 3000);
        return () => clearInterval(interval);
    }, []);

    // Basic coords mapping for City regions (using previous coordinates for stability)
    const coordsMap = {
        'Transit Station': [14.6819, 77.6006],
        'Railway Station': [14.6738, 77.5898],
        'Market Area': [14.6850, 77.5950],
        'Old Town': [14.6780, 77.6020],
        'Uptown': [14.6900, 77.6100],
        'Headquarters': [14.6815, 77.6000] // Default
    };

    // Calculate danger zones based on complaint concentration
    const areaCounts = {};
    const validComplaints = complaints.filter(c => c.status !== 'Rejected');
    
    validComplaints.forEach(c => {
        const area = c.area || 'Headquarters';
        if (coordsMap[area]) {
            areaCounts[area] = (areaCounts[area] || 0) + 1;
        } else {
            areaCounts['Headquarters'] = (areaCounts['Headquarters'] || 0) + 1;
        }
    });

    const markers = validComplaints.map(c => {
        let latlng = coordsMap[c.area];
        if(!latlng) {
            // slightly randomize around default to prevent stacking
             latlng = [14.6815 + (Math.random() - 0.5)*0.02, 77.6000 + (Math.random() - 0.5)*0.02];
        } else {
             latlng = [latlng[0] + (Math.random() - 0.5)*0.005, latlng[1] + (Math.random() - 0.5)*0.005];
        }
        return { ...c, latlng };
    });

  return (
    <div style={{ maxWidth: '1000px', margin: '2.5rem auto', padding: '0 1.25rem' }} className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="headline-lg" style={{ color: 'var(--primary)' }}>🗺️ Live Crime Map</h1>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Interactive spatial analysis of active and resolved cases</p>
      </div>

      <div style={{ height: '600px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', border: '1px solid var(--outline-variant)' }}>
        <MapContainer center={[14.6819, 77.6006]} zoom={14} style={{ height: '100%', width: '100%' }}>
            {/* Using a bright/clean map tile or dark map based on theme isn't trivial with raw leaflet, so use standard OSM */}
            <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Draw danger zones dynamically */}
            {Object.entries(areaCounts).map(([area, count]) => {
                if (count >= 3) {
                    return <Circle key={`danger-${area}`} center={coordsMap[area]} pathOptions={{ color: 'red', fillColor: '#f85149', fillOpacity: 0.2 }} radius={400} />;
                } else if (count > 0) {
                    return <Circle key={`danger-${area}`} center={coordsMap[area]} pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.2 }} radius={300} />;
                }
                return null;
            })}

            {markers.map(m => (
                <Marker key={m.id} position={m.latlng}>
                    <Popup>
                        <div style={{ fontFamily: 'var(--font-body)' }}>
                            <strong style={{ fontSize: '14px', color: '#001e42' }}>{m.id}</strong><br/>
                            <span style={{ fontSize: '12px', color: '#666' }}>{m.category} • {m.priority}</span><br/>
                            <span style={{ fontSize: '12px' }}>Status: {m.status}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {liveSos.map(sos => (
                <Circle key={`sos-${sos.id}`} center={[sos.latitude, sos.longitude]} pathOptions={{ color: 'red', fillColor: '#b91c1c', fillOpacity: 0.9, className: 'live-dot' }} radius={70}>
                    <Popup>
                        <strong style={{ color: '#b91c1c' }}>🚨 ACTIVE SOS ALARM</strong><br/>
                        <span style={{ fontSize: '12px' }}>ID: {sos.id} • Live Location</span>
                    </Popup>
                </Circle>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [page, setPage]               = useState('citizen');
  const [complaints, setComplaints]   = useState([]);
  const [user, setUser]               = useState(null);
  const [toasts, setToasts]           = useState([]);
  const [isDark, setIsDark]           = useState(false);

  const showToast = useCallback((message, type = 'info') => {
      const id = ++toastCount;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
  }, []);

  const toggleDarkMode = () => {
      setIsDark(!isDark);
      if(!isDark) document.body.classList.add('dark-mode');
      else document.body.classList.remove('dark-mode');
  };

  const fetchPublicComplaints = async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints?limit=100`);
      const data = await res.json();
      if (data.data) setComplaints(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
      fetchPublicComplaints(); 
      // Auto-login check
      const token = localStorage.getItem('aegis_token');
      if(token) {
          try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              if(payload.exp * 1000 > Date.now()) setUser(payload);
              else localStorage.removeItem('aegis_token');
          } catch(e) {}
      }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer toasts={toasts} />
      <SOSButton showToast={showToast}/>
      <Chatbot showToast={showToast} />
      <Navbar page={page} setPage={setPage} user={user} onLogout={() => { setUser(null); localStorage.removeItem('aegis_token'); setPage('citizen'); }} toggleDarkMode={toggleDarkMode} isDark={isDark} />

      <main style={{ flex: 1 }}>
        {page === 'citizen' && <ComplaintForm onComplaintFiled={fetchPublicComplaints} user={user} showToast={showToast} setPage={setPage}/>}
        {page === 'status'  && <StatusPage dbComplaints={complaints} showToast={showToast} />}
        {page === 'login'   && <AuthPage onAuthSuccess={(u) => { setUser(u); setPage('dashboard'); }} showToast={showToast} />}
        {page === 'heatmap' && <HeatmapPage complaints={complaints} />}
        {page === 'dashboard' && user && <Dashboard showToast={showToast} />}
        {page === 'dashboard' && !user && <AuthPage onAuthSuccess={(u) => { setUser(u); setPage('dashboard'); }} showToast={showToast} />}
      </main>

      <footer style={{
        marginTop: '4rem', padding: '2rem',
        background: 'var(--surface-container)',
        textAlign: 'center'
      }}>
        <p className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
          ✨ Aegis Core System v2.0 · Live Recharts Analytics · Interactive Leaflet Maps · Robust JWT Auth · City Police 2026
        </p>
      </footer>
    </div>
  );
}

export default App;