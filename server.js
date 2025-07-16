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

// Serve static files from public directory with proper security
app.use('/css', express.static('public/css', {
    setHeaders: (res, path, stat) => {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

app.use('/images', express.static('public/images', {
    setHeaders: (res, path, stat) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Serve static files from public directory root (this handles everything else)
app.use(express.static('public', {
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

// Debug middleware to log requests (only in development)
if (!process.env.VERCEL) {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

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
    
    // Allow all static assets (CSS, JS, images, fonts, etc.)
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
