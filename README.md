# Aegis Core Guardian Complaint Portal

## Project Overview
The **Aegis Core Guardian Complaint Portal** is a comprehensive full-stack solution designed for securely managing police complaints. It streamlines the filing, tracking, and management of FIRs and integrates real-time SOS alerts to enhance public safety.

## Tech Stack
* **Frontend:** React, React-Leaflet
* **Backend:** Node.js, Express.js
* **Database:** MySQL
* **Authentication:** JWT (JSON Web Tokens)
* **AI Integration:** Groq API (for complaint sentiment analysis and summary)

## Setup Steps

### 1. Configure the Environment
Copy the example environment file and update it with your actual credentials:
```bash
cp .env.example .env
```
Ensure that you set the following before running:
- `DB_PASSWORD` (Your MySQL database password)
- `GROQ_API_KEY` (Your Groq API key)
- `JWT_SECRET` (A strong secret key)

### 2. Database Initialization
Run the initialization script to set up the database schemas and admin user (ensure you have an active MySQL server running locally):
```bash
node init_db.js
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Running the Application
The project includes scripts to run both the frontend and the backend.

To run the backend server (using Nodemon for auto-reload):
```bash
npm run dev-server
```

To run the frontend React development environment:
```bash
npm start
```

## Screenshots
*(Coming soon)*
