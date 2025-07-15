const express = require('express');
const path = require('path');
const fs = require('fs');
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

// Serve static files (CSS, JS, images) - but not HTML files
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to prevent serving HTML files directly from static
app.use((req, res, next) => {
    if (req.path.endsWith('.html') && req.path !== '/') {
        // Only allow specific HTML files to be served directly
        const allowedFiles = [
            '/404.html',
            '/403.html', 
            '/500.html'
        ];
        
        if (!allowedFiles.includes(req.path)) {
            return res.redirect('/');
        }
    }
    
    // Prevent serving index files that might cause routing loops
    if (req.path.toLowerCase().includes('index') && req.path.endsWith('.html')) {
        return res.redirect('/');
    }
    
    next();
});

// Route for login page (main entry point)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-static.html'));
});

// Remove the index.html redirect since we're handling it above
// app.get('/index.html', (req, res) => {
//     res.redirect('/');
// });

// Route for main dashboard after login
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

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

// POST routes for form handling (demo purposes)
app.post('/login', (req, res) => {
    // In a real app, you'd validate login here
    console.log('Login attempt:', req.body);
    res.redirect('/dashboard');
});

app.post('/dashboard', (req, res) => {
    // This should handle login form submission
    console.log('Dashboard login data:', req.body);
    res.redirect('/dashboard');
});

app.post('/register-patient', (req, res) => {
    // In a real app, you'd save patient data to database
    console.log('Patient registration data:', req.body);
    res.redirect('/dashboard');
});

app.post('/create-user', (req, res) => {
    // In a real app, you'd save user data to database
    console.log('User creation data:', req.body);
    res.redirect('/users');
});

app.post('/create-role', (req, res) => {
    // In a real app, you'd save role data to database
    console.log('Role creation data:', req.body);
    res.redirect('/roles');
});

app.post('/settings/logo', (req, res) => {
    // In a real app, you'd save logo file to server
    console.log('Logo update request');
    res.redirect('/settings');
});

app.post('/settings/banner', (req, res) => {
    // In a real app, you'd save banner text to database
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

app.listen(port, () => {
    console.log(`Hospital Management System running on port ${port}`);
    console.log(`Visit: http://localhost:${port}`);
});
