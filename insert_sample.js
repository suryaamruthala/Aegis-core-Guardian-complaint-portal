const mysql = require('mysql2/promise');

async function seed() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'police_portal'
  });

  const sampleComplaints = [
    { id: 'FIR-2026-1001', name: 'Ravi Kumar', category: 'Theft', priority: 'High', status: 'Under Investigation', date: '21/3/2026', area: 'Bus Stand', filedBy: 'officer' },
    { id: 'FIR-2026-1002', name: 'Lakshmi Devi', category: 'Assault', priority: 'High', status: 'FIR Filed', date: '21/3/2026', area: 'Old Town', filedBy: 'officer' },
    { id: 'FIR-2026-1003', name: 'Mohammed Salim', category: 'Fraud', priority: 'Medium', status: 'Pending Approval', date: '20/3/2026', area: 'Market', filedBy: 'citizen', complaint: 'Fraud at market area' },
    { id: 'FIR-2026-1004', name: 'Sunitha Reddy', category: 'Theft', priority: 'Low', status: 'Resolved', date: '20/3/2026', area: 'Railway Station', filedBy: 'officer' },
  ];

  for(const c of sampleComplaints) {
    try {
      await db.query(`INSERT IGNORE INTO complaints (id, name, phone, address, complaint, category, priority, ipc_section, summary, recommended_action, area, officer, badge_no, station, date, status, filedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [c.id, c.name, '', '', c.complaint || '', c.category, c.priority, '', '', '', c.area, '', '', '', c.date, c.status, c.filedBy]);
    } catch(e) {
      console.log(e.message);
    }
  }

  console.log('Sample data seeded successfully!');
  process.exit(0);
}

seed();
