const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Simple test route
app.get('/', (req, res) => {
    console.log('Test route accessed');
    res.send('<h1>Test Server Working</h1>');
});

// Test login route
app.get('/login', (req, res) => {
    console.log('Login route accessed');
    const filePath = path.join(__dirname, 'login-static.html');
    console.log('File path:', filePath);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Login file not found');
    }
});

app.listen(port, () => {
    console.log(`Test server running on port ${port}`);
});
