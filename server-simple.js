const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from public directory
app.use('/css', express.static('public/css'));
app.use('/images', express.static('public/images'));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for login page (main entry point)
app.get('/', (req, res) => {
    console.log('Root route accessed');
    const filePath = path.join(__dirname, 'login-static.html');
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
        console.log('File exists, serving:', filePath);
        res.sendFile(filePath);
    } else {
        console.log('File does not exist:', filePath);
        res.status(404).send('Login page not found');
    }
});

// Route for main dashboard after login
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send('Page not found');
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
