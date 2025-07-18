const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const routes = require('./routes');
const app = express();
const port = process.env.PORT || 3000;

// Simple template helper function
function renderTemplate(templatePath, data) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    let content = template;
    
    // Replace placeholders with data
    Object.keys(data).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(placeholder, data[key] || '');
    });
    
    return content;
}

// Serve static files from public directory with proper security
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
    setHeaders: (res, path, stat) => {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

app.use('/images', express.static(path.join(__dirname, 'public', 'images'), {
    setHeaders: (res, path, stat) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Serve static files from public directory root (this handles everything else)
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        // Set proper MIME types
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (path.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        } else if (path.endsWith('.ico')) {
            res.setHeader('Content-Type', 'image/x-icon');
        }
        
        // Security headers for all static files
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware to prevent access to sensitive files (but allow static assets)
app.use((req, res, next) => {
    // Block access to sensitive files and directories
    const blockedPaths = [
        '/server.js',
        '/package.json',
        '/node_modules',
        '/.env',
        '/.git',
        '/vercel.json',
        '/.vercelignore'
    ];
    
    // Check if path is blocked
    if (blockedPaths.some(blocked => req.path.startsWith(blocked))) {
        return res.status(403).send('Access forbidden');
    }
    
    // Allow all static assets (CSS, JS, images, fonts, etc.) - pass through immediately
    if (req.path.startsWith('/css/') || 
        req.path.startsWith('/images/') || 
        req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        return next();
    }
    
    // Block direct access to other file types that aren't routes
    const blockedExtensions = ['.json', '.env', '.md'];
    if (blockedExtensions.some(ext => req.path.endsWith(ext))) {
        return res.status(403).send('Access forbidden');
    }
    
    next();
});

// Debug middleware to log requests (only in development)
if (!process.env.VERCEL) {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Route for login page (main entry point)
app.get('/', (req, res) => {
    console.log('Root route accessed');
    const filePath = path.join(__dirname, 'login-static.html');
    console.log('Serving file:', filePath);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error('File not found:', filePath);
        res.status(404).send('Login page not found');
    }
});

// Route for main dashboard after login
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Test route for CSS loading
app.get('/test-css', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-css.html'));
});

// API test route
app.get('/api-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-test.html'));
});

// Debug route to check file existence
app.get('/debug-files', (req, res) => {
    const fs = require('fs');
    const publicDir = path.join(__dirname, 'public');
    const cssDir = path.join(publicDir, 'css');
    const imagesDir = path.join(publicDir, 'images');
    
    const checkFiles = [
        'public/css/bootstrap.min.css',
        'public/css/all.min.css',
        'public/css/dashboard.css'
    ];
    
    const result = {
        __dirname: __dirname,
        publicDir: publicDir,
        cssDir: cssDir,
        files: {}
    };
    
    checkFiles.forEach(file => {
        const fullPath = path.join(__dirname, file);
        result.files[file] = {
            exists: fs.existsSync(fullPath),
            fullPath: fullPath
        };
    });
    
    res.json(result);
});

// API Routes for JSON Database

// Authentication API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = db.getUserByUsername(username);
    
    if (!user || user.password !== password) {
        db.addLog(user ? user.id : 0, 'LOGIN_FAILED', `Failed login attempt for ${username}`, 'WARNING');
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
        db.addLog(user.id, 'LOGIN_FAILED', `Inactive user login attempt: ${username}`, 'WARNING');
        return res.status(403).json({ error: 'Account is inactive' });
    }
    
    // Update last login
    db.update('users', user.id, { lastLogin: new Date().toISOString() });
    db.addLog(user.id, 'USER_LOGIN', `User ${username} logged in`, 'INFO');
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
});

// Users API
app.get('/api/users', (req, res) => {
    const users = db.getAll('users').map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(users);
});

app.get('/api/users/active', (req, res) => {
    const users = db.getActiveUsers().map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(users);
});

app.get('/api/users/inactive', (req, res) => {
    const users = db.getInactiveUsers().map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(users);
});

app.get('/api/users/:id', (req, res) => {
    const user = db.getById('users', req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

app.post('/api/users', (req, res) => {
    try {
        const newUser = db.create('users', req.body);
        db.addLog(newUser.id, 'USER_CREATED', `New user created: ${newUser.username}`, 'INFO');
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:id', (req, res) => {
    try {
        const updatedUser = db.update('users', req.params.id, req.body);
        db.addLog(updatedUser.id, 'USER_UPDATED', `User updated: ${updatedUser.username}`, 'INFO');
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        const deletedUser = db.delete('users', req.params.id);
        db.addLog(deletedUser.id, 'USER_DELETED', `User deleted: ${deletedUser.username}`, 'WARNING');
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Patients API
app.get('/api/patients', (req, res) => {
    const patients = db.getAll('patients');
    res.json(patients);
});

app.get('/api/patients/active', (req, res) => {
    const patients = db.getActivePatients();
    res.json(patients);
});

app.get('/api/patients/search', (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    const patients = db.getPatientsByName(q);
    res.json(patients);
});

app.get('/api/patients/:id', (req, res) => {
    const patient = db.getById('patients', req.params.id);
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
});

app.post('/api/patients', (req, res) => {
    try {
        const newPatient = db.create('patients', req.body);
        db.addLog(1, 'PATIENT_CREATED', `New patient created: ${newPatient.firstName} ${newPatient.lastName}`, 'INFO');
        res.status(201).json(newPatient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/patients/:id', (req, res) => {
    try {
        const updatedPatient = db.update('patients', req.params.id, req.body);
        db.addLog(1, 'PATIENT_UPDATED', `Patient updated: ${updatedPatient.firstName} ${updatedPatient.lastName}`, 'INFO');
        res.json(updatedPatient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/patients/:id', (req, res) => {
    try {
        const deletedPatient = db.delete('patients', req.params.id);
        db.addLog(1, 'PATIENT_DELETED', `Patient deleted: ${deletedPatient.firstName} ${deletedPatient.lastName}`, 'WARNING');
        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Appointments API
app.get('/api/appointments', (req, res) => {
    const appointments = db.getAll('appointments');
    res.json(appointments);
});

app.get('/api/appointments/patient/:patientId', (req, res) => {
    const appointments = db.getAppointmentsByPatient(req.params.patientId);
    res.json(appointments);
});

app.get('/api/appointments/doctor/:doctorId', (req, res) => {
    const appointments = db.getAppointmentsByDoctor(req.params.doctorId);
    res.json(appointments);
});

app.get('/api/appointments/date/:date', (req, res) => {
    const appointments = db.getAppointmentsByDate(req.params.date);
    res.json(appointments);
});

app.get('/api/appointments/status/:status', (req, res) => {
    const appointments = db.getAppointmentsByStatus(req.params.status);
    res.json(appointments);
});

app.get('/api/appointments/:id', (req, res) => {
    const appointment = db.getById('appointments', req.params.id);
    if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(appointment);
});

app.post('/api/appointments', (req, res) => {
    try {
        const newAppointment = db.create('appointments', req.body);
        db.addLog(1, 'APPOINTMENT_CREATED', `New appointment created for patient ID: ${newAppointment.patientId}`, 'INFO');
        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/appointments/:id', (req, res) => {
    try {
        const updatedAppointment = db.update('appointments', req.params.id, req.body);
        db.addLog(1, 'APPOINTMENT_UPDATED', `Appointment updated: ${updatedAppointment.id}`, 'INFO');
        res.json(updatedAppointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/appointments/:id', (req, res) => {
    try {
        const deletedAppointment = db.delete('appointments', req.params.id);
        db.addLog(1, 'APPOINTMENT_DELETED', `Appointment deleted: ${deletedAppointment.id}`, 'WARNING');
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Roles API
app.get('/api/roles', (req, res) => {
    const roles = db.getAll('roles');
    res.json(roles);
});

app.get('/api/roles/:id', (req, res) => {
    const role = db.getById('roles', req.params.id);
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
});

app.post('/api/roles', (req, res) => {
    try {
        const newRole = db.create('roles', req.body);
        db.addLog(1, 'ROLE_CREATED', `New role created: ${newRole.name}`, 'INFO');
        res.status(201).json(newRole);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/roles/:id', (req, res) => {
    try {
        const updatedRole = db.update('roles', req.params.id, req.body);
        db.addLog(1, 'ROLE_UPDATED', `Role updated: ${updatedRole.name}`, 'INFO');
        res.json(updatedRole);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/roles/:id', (req, res) => {
    try {
        const deletedRole = db.delete('roles', req.params.id);
        db.addLog(1, 'ROLE_DELETED', `Role deleted: ${deletedRole.name}`, 'WARNING');
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Permissions API
app.get('/api/permissions', (req, res) => {
    const permissions = db.getAll('permissions');
    res.json(permissions);
});

// Departments API
app.get('/api/departments', (req, res) => {
    const departments = db.getAll('departments');
    res.json(departments);
});

app.get('/api/departments/:id', (req, res) => {
    const department = db.getById('departments', req.params.id);
    if (!department) {
        return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
});

app.post('/api/departments', (req, res) => {
    try {
        const newDepartment = db.create('departments', req.body);
        db.addLog(1, 'DEPARTMENT_CREATED', `New department created: ${newDepartment.name}`, 'INFO');
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/departments/:id', (req, res) => {
    try {
        const updatedDepartment = db.update('departments', req.params.id, req.body);
        db.addLog(1, 'DEPARTMENT_UPDATED', `Department updated: ${updatedDepartment.name}`, 'INFO');
        res.json(updatedDepartment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/departments/:id', (req, res) => {
    try {
        const deletedDepartment = db.delete('departments', req.params.id);
        db.addLog(1, 'DEPARTMENT_DELETED', `Department deleted: ${deletedDepartment.name}`, 'WARNING');
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Logs API
app.get('/api/logs', (req, res) => {
    const logs = db.getAll('logs');
    res.json(logs);
});

app.get('/api/logs/user/:userId', (req, res) => {
    const logs = db.getLogsByUser(req.params.userId);
    res.json(logs);
});

app.get('/api/logs/level/:level', (req, res) => {
    const logs = db.getLogsByLevel(req.params.level);
    res.json(logs);
});

// Statistics API
app.get('/api/stats', (req, res) => {
    const stats = db.getStats();
    res.json(stats);
});

// Database management API
app.post('/api/backup', (req, res) => {
    try {
        const backupPath = db.backup();
        res.json({ message: 'Backup created successfully', path: backupPath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/restore', (req, res) => {
    try {
        const { backupPath } = req.body;
        const success = db.restore(backupPath);
        if (success) {
            res.json({ message: 'Database restored successfully' });
        } else {
            res.status(500).json({ error: 'Failed to restore database' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Module Routes - Use the new modular routing system
app.use('/', routes);

// Legacy Routes (keeping for backward compatibility)
// Route for home page
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Route for user management
app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'users-static.html'));
});

// Route for patient registration
app.get('/register-patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'register-patient-static.html'));
});

// Route for client search
app.get('/client-search', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-search-static.html'));
});

// Route for roles
app.get('/roles', (req, res) => {
    res.sendFile(path.join(__dirname, 'RoleList.html'));
});

// Route for permissions
app.get('/permissions', (req, res) => {
    res.sendFile(path.join(__dirname, 'PermissionList.html'));
});

// Route for audit logs
app.get('/audit-logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'LogList.html'));
});

// Route for settings
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings-static.html'));
});

// Route for create user
app.get('/create-user', (req, res) => {
    res.sendFile(path.join(__dirname, 'CreateUser.html'));
});

// Route for create role
app.get('/create-role', (req, res) => {
    res.sendFile(path.join(__dirname, 'CreateRole.html'));
});

// POST routes for form handling
app.post('/login', (req, res) => {
    console.log('Login attempt:', req.body);
    res.redirect('/dashboard');
});

app.post('/dashboard', (req, res) => {
    console.log('Dashboard login data:', req.body);
    res.redirect('/dashboard');
});

app.post('/register-patient', (req, res) => {
    console.log('Patient registration data:', req.body);
    res.redirect('/dashboard');
});

app.post('/create-user', (req, res) => {
    console.log('User creation data:', req.body);
    res.redirect('/users');
});

app.post('/create-role', (req, res) => {
    console.log('Role creation data:', req.body);
    res.redirect('/roles');
});

app.post('/settings/logo', (req, res) => {
    console.log('Logo update request');
    res.redirect('/settings');
});

app.post('/settings/banner', (req, res) => {
    console.log('Banner update data:', req.body);
    res.redirect('/settings');
});

// Simple API endpoints
app.get('/api/stats', (req, res) => {
    res.json({
        totalPatients: 2456,
        todaysAppointments: 24,
        activeStaff: 18,
        occupiedBeds: 65
    });
});

app.get('/api/users', (req, res) => {
    res.json([
        { id: 1, name: 'Dr. John Smith', role: 'Doctor', sex: 'Male' },
        { id: 2, name: 'Nurse Sarah Johnson', role: 'Nurse', sex: 'Female' },
        { id: 3, name: 'Dr. Emily Davis', role: 'Doctor', sex: 'Female' }
    ]);
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Hospital Management System running on port ${port}`);
        console.log(`Visit: http://localhost:${port}`);
    });
}

// Export the Express app for Vercel
module.exports = app;
