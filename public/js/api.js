// API Helper functions for Hospital Management System

class HospitalAPI {
    constructor() {
        this.baseUrl = '';
        this.currentUser = null;
    }

    // Authentication
    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    // Generic API methods
    async get(endpoint) {
        const response = await fetch(`/api/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async post(endpoint, data) {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        return await response.json();
    }

    async put(endpoint, data) {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        return await response.json();
    }

    async delete(endpoint) {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        return await response.json();
    }

    // User methods
    async getUsers() {
        return await this.get('users');
    }

    async getActiveUsers() {
        return await this.get('users/active');
    }

    async getInactiveUsers() {
        return await this.get('users/inactive');
    }

    async getUser(id) {
        return await this.get(`users/${id}`);
    }

    async createUser(userData) {
        return await this.post('users', userData);
    }

    async updateUser(id, userData) {
        return await this.put(`users/${id}`, userData);
    }

    async deleteUser(id) {
        return await this.delete(`users/${id}`);
    }

    // Patient methods
    async getPatients() {
        return await this.get('patients');
    }

    async getActivePatients() {
        return await this.get('patients/active');
    }

    async searchPatients(query) {
        return await this.get(`patients/search?q=${encodeURIComponent(query)}`);
    }

    async getPatient(id) {
        return await this.get(`patients/${id}`);
    }

    async createPatient(patientData) {
        return await this.post('patients', patientData);
    }

    async updatePatient(id, patientData) {
        return await this.put(`patients/${id}`, patientData);
    }

    async deletePatient(id) {
        return await this.delete(`patients/${id}`);
    }

    // Appointment methods
    async getAppointments() {
        return await this.get('appointments');
    }

    async getAppointmentsByPatient(patientId) {
        return await this.get(`appointments/patient/${patientId}`);
    }

    async getAppointmentsByDoctor(doctorId) {
        return await this.get(`appointments/doctor/${doctorId}`);
    }

    async getAppointmentsByDate(date) {
        return await this.get(`appointments/date/${date}`);
    }

    async getAppointmentsByStatus(status) {
        return await this.get(`appointments/status/${status}`);
    }

    async getAppointment(id) {
        return await this.get(`appointments/${id}`);
    }

    async createAppointment(appointmentData) {
        return await this.post('appointments', appointmentData);
    }

    async updateAppointment(id, appointmentData) {
        return await this.put(`appointments/${id}`, appointmentData);
    }

    async deleteAppointment(id) {
        return await this.delete(`appointments/${id}`);
    }

    // Role methods
    async getRoles() {
        return await this.get('roles');
    }

    async getRole(id) {
        return await this.get(`roles/${id}`);
    }

    async createRole(roleData) {
        return await this.post('roles', roleData);
    }

    async updateRole(id, roleData) {
        return await this.put(`roles/${id}`, roleData);
    }

    async deleteRole(id) {
        return await this.delete(`roles/${id}`);
    }

    // Permission methods
    async getPermissions() {
        return await this.get('permissions');
    }

    // Department methods
    async getDepartments() {
        return await this.get('departments');
    }

    async getDepartment(id) {
        return await this.get(`departments/${id}`);
    }

    async createDepartment(departmentData) {
        return await this.post('departments', departmentData);
    }

    async updateDepartment(id, departmentData) {
        return await this.put(`departments/${id}`, departmentData);
    }

    async deleteDepartment(id) {
        return await this.delete(`departments/${id}`);
    }

    // Log methods
    async getLogs() {
        return await this.get('logs');
    }

    async getLogsByUser(userId) {
        return await this.get(`logs/user/${userId}`);
    }

    async getLogsByLevel(level) {
        return await this.get(`logs/level/${level}`);
    }

    // Statistics methods
    async getStats() {
        return await this.get('stats');
    }

    // Database management methods
    async createBackup() {
        return await this.post('backup', {});
    }

    async restoreBackup(backupPath) {
        return await this.post('restore', { backupPath });
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatDateOnly(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatTimeOnly(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString();
    }
}

// Create global instance
const api = new HospitalAPI();

// Example usage functions
async function loadDashboardData() {
    try {
        const stats = await api.getStats();
        const recentAppointments = await api.getAppointments();
        const activeUsers = await api.getActiveUsers();
        
        // Update dashboard UI
        updateDashboardStats(stats);
        updateRecentAppointments(recentAppointments.slice(0, 5));
        updateActiveUsers(activeUsers.slice(0, 5));
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(stats) {
    // Update stats cards
    document.getElementById('total-users')?.textContent = stats.users.total;
    document.getElementById('active-users')?.textContent = stats.users.active;
    document.getElementById('total-patients')?.textContent = stats.patients.total;
    document.getElementById('total-appointments')?.textContent = stats.appointments.total;
}

function updateRecentAppointments(appointments) {
    const container = document.getElementById('recent-appointments');
    if (!container) return;

    container.innerHTML = appointments.map(appointment => `
        <div class="appointment-item">
            <strong>Patient ID: ${appointment.patientId}</strong>
            <span class="badge badge-${appointment.status.toLowerCase()}">${appointment.status}</span>
            <small>${api.formatDate(appointment.appointmentDate)}</small>
        </div>
    `).join('');
}

function updateActiveUsers(users) {
    const container = document.getElementById('active-users');
    if (!container) return;

    container.innerHTML = users.map(user => `
        <div class="user-item">
            <strong>${user.firstName} ${user.lastName}</strong>
            <span class="badge badge-secondary">${user.role}</span>
            <small>${user.department}</small>
        </div>
    `).join('');
}

// Initialize API on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const currentUser = api.getCurrentUser();
    if (currentUser) {
        console.log('User logged in:', currentUser);
        // Load dashboard data if on dashboard page
        if (window.location.pathname === '/dashboard') {
            loadDashboardData();
        }
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HospitalAPI;
}
