# Hospital Management System - Node.js Web Application

This is a Hospital Management System web application built with Node.js and Express.js serving HTML pages with Bootstrap frontend.

## Features

- User Authentication (Login)
- Patient Registration
- Client Search
- User Management
- Hospital Department Management
- Audit Logs
- System Settings

## Local Development

### Prerequisites
- Node.js 14+ installed
- npm package manager

### Setup
1. Clone/download the project files
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

## Deployment Options

### 1. Vercel (Recommended for Node.js)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts to configure your deployment.

**Alternative: Connect via GitHub**
1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Vercel at https://vercel.com
3. Vercel will automatically deploy your application

### 2. Render (Alternative)
1. Create a new account at [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service
4. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
5. Deploy!

### 3. Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`

### 3. Netlify (For Static Version Only)
1. You'd need to build static HTML files without the Express server
2. Upload to Netlify
3. Set redirects in `_redirects` file

### 4. Vercel (Node.js Apps)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Vercel will auto-detect the Node.js app

## File Structure

```
├── server.js              # Express server
├── package.json           # Dependencies
├── login-static.html      # Clean login page
├── base_3.html           # Main dashboard template
├── UserList.html         # User management
├── RegisterClient.html   # Patient registration
├── ClientSearch.html     # Client search
├── *.css                 # Stylesheets
├── *.svg                 # Icons
└── assets/               # Static assets
```

## Environment Variables

For deployment platforms, you may need to set:
- `PORT` - Server port (auto-detected on most platforms)
- `NODE_ENV` - Set to 'production' for production builds

## Notes

- This is a frontend-only version without backend functionality
- Forms will need backend integration for full functionality
- Database integration required for persistent data
- Authentication is cosmetic only in this version

## Production Considerations

For a production deployment, you would need:
1. Database setup (MySQL, PostgreSQL, etc.)
2. Backend API (Java Spring Boot, Node.js, etc.)
3. Authentication system
4. Security headers and HTTPS
5. Error handling and logging
