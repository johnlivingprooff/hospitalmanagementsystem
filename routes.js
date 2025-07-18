const express = require('express');
const path = require('path');
const db = require('./database');
const TemplateEngine = require('./templateEngine');

// Initialize template engine
const templateEngine = new TemplateEngine(path.join(__dirname, 'templates'));

// Create router
const router = express.Router();

// Helper function to get user permissions
function getUserPermissions(user) {
    if (!user) return [];
    
    const userRole = db.getRoleByName(user.role);
    return userRole ? userRole.permissions : [];
}

// Helper function to check permission
function hasPermission(user, permission) {
    const permissions = getUserPermissions(user);
    return permissions.includes(permission);
}

// Helper function to render template with context
function renderTemplate(res, templatePath, context = {}) {
    const defaultContext = {
        user: res.locals.user || null,
        userPermissions: res.locals.userPermissions || [],
        currentDate: new Date().toISOString(),
        siteName: 'Hospital Management System'
    };
    
    const fullContext = { ...defaultContext, ...context };
    const html = templateEngine.render(templatePath, fullContext);
    res.send(html);
}

// Middleware to set user context
router.use((req, res, next) => {
    // In a real app, you'd get this from session/JWT
    // For demo, we'll use a default user
    const defaultUser = db.getById('users', 1); // Admin user
    
    if (defaultUser) {
        res.locals.user = defaultUser;
        res.locals.userPermissions = getUserPermissions(defaultUser);
    }
    
    next();
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

router.get('/login', (req, res) => {
    renderTemplate(res, 'auth/login.html', {
        pageTitle: 'Login',
        email: req.query.email || ''
    });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = db.getUserByEmail(email) || db.getUserByUsername(email);
    
    if (!user || user.password !== password) {
        return renderTemplate(res, 'auth/login.html', {
            pageTitle: 'Login',
            error: 'Invalid email or password',
            email: email
        });
    }
    
    if (!user.isActive) {
        return renderTemplate(res, 'auth/login.html', {
            pageTitle: 'Login',
            error: 'Account is inactive',
            email: email
        });
    }
    
    // Update last login
    db.update('users', user.id, { lastLogin: new Date().toISOString() });
    db.addLog(user.id, 'USER_LOGIN', `User ${user.username} logged in`, 'INFO');
    
    // In a real app, you'd set session/JWT here
    res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
    // Clear session in real app
    res.redirect('/login');
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

router.get('/dashboard', (req, res) => {
    const stats = db.getStats();
    const recentAppointments = db.getAll('appointments').slice(0, 5);
    const recentPatients = db.getAll('patients').slice(0, 5);
    
    renderTemplate(res, 'home/dashboard.html', {
        pageTitle: 'Dashboard',
        stats: stats,
        recentAppointments: recentAppointments,
        recentPatients: recentPatients
    });
});

// ============================================================================
// PATIENT ROUTES
// ============================================================================

router.get('/patients', (req, res) => {
    const patients = db.getAll('patients');
    
    renderTemplate(res, 'patient/list.html', {
        pageTitle: 'Patients',
        listTitle: 'All Patients',
        patients: patients
    });
});

router.get('/patients/new', (req, res) => {
    renderTemplate(res, 'patient/new.html', {
        pageTitle: 'New Patient',
        departments: db.getAll('departments')
    });
});

router.post('/patients/new', (req, res) => {
    try {
        const newPatient = db.create('patients', req.body);
        db.addLog(res.locals.user.id, 'PATIENT_CREATED', `New patient created: ${newPatient.firstName} ${newPatient.lastName}`, 'INFO');
        res.redirect('/patients');
    } catch (error) {
        renderTemplate(res, 'patient/new.html', {
            pageTitle: 'New Patient',
            error: error.message,
            departments: db.getAll('departments'),
            formData: req.body
        });
    }
});

router.get('/patients/:id', (req, res) => {
    const patient = db.getById('patients', req.params.id);
    
    if (!patient) {
        return res.status(404).send('Patient not found');
    }
    
    const appointments = db.getAppointmentsByPatient(req.params.id);
    
    renderTemplate(res, 'patient/details-base.html', {
        pageTitle: `Patient: ${patient.firstName} ${patient.lastName}`,
        patient: patient,
        appointments: appointments
    });
});

router.get('/patients/:id/edit', (req, res) => {
    const patient = db.getById('patients', req.params.id);
    
    if (!patient) {
        return res.status(404).send('Patient not found');
    }
    
    renderTemplate(res, 'patient/edit.html', {
        pageTitle: `Edit Patient: ${patient.firstName} ${patient.lastName}`,
        patient: patient,
        departments: db.getAll('departments')
    });
});

router.post('/patients/:id/edit', (req, res) => {
    try {
        const updatedPatient = db.update('patients', req.params.id, req.body);
        db.addLog(res.locals.user.id, 'PATIENT_UPDATED', `Patient updated: ${updatedPatient.firstName} ${updatedPatient.lastName}`, 'INFO');
        res.redirect(`/patients/${req.params.id}`);
    } catch (error) {
        const patient = db.getById('patients', req.params.id);
        renderTemplate(res, 'patient/edit.html', {
            pageTitle: `Edit Patient: ${patient.firstName} ${patient.lastName}`,
            error: error.message,
            patient: { ...patient, ...req.body },
            departments: db.getAll('departments')
        });
    }
});

// ============================================================================
// APPOINTMENT ROUTES
// ============================================================================

router.get('/appointments', (req, res) => {
    const appointments = db.getAll('appointments');
    const patients = db.getAll('patients');
    const doctors = db.getAll('users').filter(u => u.role === 'Doctor');
    
    // Enrich appointments with patient and doctor data
    const enrichedAppointments = appointments.map(app => {
        const patient = patients.find(p => p.id === app.patientId);
        const doctor = doctors.find(d => d.id === app.doctorId);
        
        return {
            ...app,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown'
        };
    });
    
    renderTemplate(res, 'doctors/appointments/list.html', {
        pageTitle: 'Appointments',
        appointments: enrichedAppointments
    });
});

router.get('/appointments/new', (req, res) => {
    const patients = db.getAll('patients');
    const doctors = db.getAll('users').filter(u => u.role === 'Doctor');
    const departments = db.getAll('departments');
    
    renderTemplate(res, 'doctors/appointments/new.html', {
        pageTitle: 'New Appointment',
        patients: patients,
        doctors: doctors,
        departments: departments
    });
});

router.post('/appointments/new', (req, res) => {
    try {
        const newAppointment = db.create('appointments', req.body);
        db.addLog(res.locals.user.id, 'APPOINTMENT_CREATED', `New appointment created for patient ID: ${newAppointment.patientId}`, 'INFO');
        res.redirect('/appointments');
    } catch (error) {
        renderTemplate(res, 'doctors/appointments/new.html', {
            pageTitle: 'New Appointment',
            error: error.message,
            patients: db.getAll('patients'),
            doctors: db.getAll('users').filter(u => u.role === 'Doctor'),
            departments: db.getAll('departments'),
            formData: req.body
        });
    }
});

// ============================================================================
// DOCTOR ROUTES
// ============================================================================

router.get('/doctors', (req, res) => {
    const doctors = db.getAll('users').filter(u => u.role === 'Doctor');
    
    renderTemplate(res, 'doctors/list.html', {
        pageTitle: 'Doctors',
        doctors: doctors
    });
});

router.get('/doctors/schedule', (req, res) => {
    const doctorId = req.query.doctor || res.locals.user.id;
    const appointments = db.getAppointmentsByDoctor(doctorId);
    const patients = db.getAll('patients');
    
    // Enrich appointments with patient data
    const enrichedAppointments = appointments.map(app => {
        const patient = patients.find(p => p.id === app.patientId);
        return {
            ...app,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'
        };
    });
    
    renderTemplate(res, 'doctors/schedule/list.html', {
        pageTitle: 'Doctor Schedule',
        appointments: enrichedAppointments,
        doctors: db.getAll('users').filter(u => u.role === 'Doctor'),
        selectedDoctor: doctorId
    });
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

router.get('/admin/users', (req, res) => {
    if (!hasPermission(res.locals.user, 'user_management')) {
        return res.status(403).send('Access denied');
    }
    
    const users = db.getAll('users');
    
    renderTemplate(res, 'accounts/list.html', {
        pageTitle: 'User Management',
        users: users
    });
});

router.get('/admin/users/new', (req, res) => {
    if (!hasPermission(res.locals.user, 'user_management')) {
        return res.status(403).send('Access denied');
    }
    
    renderTemplate(res, 'accounts/new.html', {
        pageTitle: 'New User',
        roles: db.getAll('roles'),
        departments: db.getAll('departments')
    });
});

router.post('/admin/users/new', (req, res) => {
    if (!hasPermission(res.locals.user, 'user_management')) {
        return res.status(403).send('Access denied');
    }
    
    try {
        const newUser = db.create('users', req.body);
        db.addLog(res.locals.user.id, 'USER_CREATED', `New user created: ${newUser.username}`, 'INFO');
        res.redirect('/admin/users');
    } catch (error) {
        renderTemplate(res, 'accounts/new.html', {
            pageTitle: 'New User',
            error: error.message,
            roles: db.getAll('roles'),
            departments: db.getAll('departments'),
            formData: req.body
        });
    }
});

router.get('/admin/roles', (req, res) => {
    if (!hasPermission(res.locals.user, 'user_management')) {
        return res.status(403).send('Access denied');
    }
    
    const roles = db.getAll('roles');
    
    renderTemplate(res, 'role/list.html', {
        pageTitle: 'Role Management',
        roles: roles
    });
});

router.get('/admin/permissions', (req, res) => {
    if (!hasPermission(res.locals.user, 'user_management')) {
        return res.status(403).send('Access denied');
    }
    
    const permissions = db.getAll('permissions');
    
    renderTemplate(res, 'permission/list.html', {
        pageTitle: 'Permission Management',
        permissions: permissions
    });
});

// ============================================================================
// SYSTEM ROUTES
// ============================================================================

router.get('/system/logs', (req, res) => {
    if (!hasPermission(res.locals.user, 'system_admin')) {
        return res.status(403).send('Access denied');
    }
    
    const logs = db.getAll('logs');
    
    renderTemplate(res, 'audit/list.html', {
        pageTitle: 'System Logs',
        logs: logs
    });
});

router.get('/system/settings', (req, res) => {
    if (!hasPermission(res.locals.user, 'system_admin')) {
        return res.status(403).send('Access denied');
    }
    
    renderTemplate(res, 'system/settings.html', {
        pageTitle: 'System Settings'
    });
});

// ============================================================================
// BILLING ROUTES
// ============================================================================

router.get('/billing', (req, res) => {
    if (!hasPermission(res.locals.user, 'ViewPatientBills')) {
        return res.status(403).send('Access denied');
    }
    
    // Mock billing data
    const bills = [
        { id: 1, patientId: 1, amount: 250.00, status: 'Paid', date: '2024-01-15' },
        { id: 2, patientId: 2, amount: 150.00, status: 'Pending', date: '2024-01-16' }
    ];
    
    renderTemplate(res, 'bills/list.html', {
        pageTitle: 'Billing',
        bills: bills
    });
});

// ============================================================================
// REPORTS ROUTES
// ============================================================================

router.get('/reports', (req, res) => {
    if (!hasPermission(res.locals.user, 'reports')) {
        return res.status(403).send('Access denied');
    }
    
    const stats = db.getStats();
    
    renderTemplate(res, 'system/reports.html', {
        pageTitle: 'Reports',
        stats: stats
    });
});

// ============================================================================
// SEARCH ROUTES
// ============================================================================

router.get('/search', (req, res) => {
    const query = req.query.q || '';
    let results = [];
    
    if (query.length > 0) {
        const patients = db.getPatientsByName(query);
        const users = db.getAll('users').filter(u => 
            u.firstName.toLowerCase().includes(query.toLowerCase()) ||
            u.lastName.toLowerCase().includes(query.toLowerCase())
        );
        
        results = [
            ...patients.map(p => ({ ...p, type: 'patient' })),
            ...users.map(u => ({ ...u, type: 'user' }))
        ];
    }
    
    renderTemplate(res, 'search/results.html', {
        pageTitle: 'Search Results',
        query: query,
        results: results
    });
});

module.exports = router;
