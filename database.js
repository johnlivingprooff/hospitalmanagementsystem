const fs = require('fs');
const path = require('path');

class JSONDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'database');
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
    }

    // Generic methods for any table
    getAll(table) {
        try {
            const filePath = path.join(this.dbPath, `${table}.json`);
            if (!fs.existsSync(filePath)) {
                return [];
            }
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${table}:`, error);
            return [];
        }
    }

    getById(table, id) {
        const data = this.getAll(table);
        return data.find(item => item.id === parseInt(id));
    }

    create(table, newItem) {
        try {
            const data = this.getAll(table);
            const nextId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
            
            const itemWithId = {
                id: nextId,
                ...newItem,
                createdAt: new Date().toISOString()
            };
            
            data.push(itemWithId);
            this.saveToFile(table, data);
            return itemWithId;
        } catch (error) {
            console.error(`Error creating ${table}:`, error);
            throw error;
        }
    }

    update(table, id, updateData) {
        try {
            const data = this.getAll(table);
            const index = data.findIndex(item => item.id === parseInt(id));
            
            if (index === -1) {
                throw new Error(`Item with id ${id} not found in ${table}`);
            }
            
            data[index] = {
                ...data[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            this.saveToFile(table, data);
            return data[index];
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            throw error;
        }
    }

    delete(table, id) {
        try {
            const data = this.getAll(table);
            const index = data.findIndex(item => item.id === parseInt(id));
            
            if (index === -1) {
                throw new Error(`Item with id ${id} not found in ${table}`);
            }
            
            const deletedItem = data.splice(index, 1)[0];
            this.saveToFile(table, data);
            return deletedItem;
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
            throw error;
        }
    }

    saveToFile(table, data) {
        try {
            const filePath = path.join(this.dbPath, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Error saving ${table}:`, error);
            throw error;
        }
    }

    // Search methods
    search(table, searchCriteria) {
        const data = this.getAll(table);
        return data.filter(item => {
            return Object.keys(searchCriteria).every(key => {
                const itemValue = item[key];
                const searchValue = searchCriteria[key];
                
                if (typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(searchValue.toLowerCase());
                }
                return itemValue === searchValue;
            });
        });
    }

    // Specific methods for common operations
    
    // User methods
    getUserByUsername(username) {
        const users = this.getAll('users');
        return users.find(user => user.username === username);
    }

    getUserByEmail(email) {
        const users = this.getAll('users');
        return users.find(user => user.email === email);
    }

    getActiveUsers() {
        const users = this.getAll('users');
        return users.filter(user => user.isActive);
    }

    getInactiveUsers() {
        const users = this.getAll('users');
        return users.filter(user => !user.isActive);
    }

    // Patient methods
    getPatientsByName(searchTerm) {
        const patients = this.getAll('patients');
        return patients.filter(patient => 
            patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    getActivePatients() {
        const patients = this.getAll('patients');
        return patients.filter(patient => patient.isActive);
    }

    // Appointment methods
    getAppointmentsByPatient(patientId) {
        const appointments = this.getAll('appointments');
        return appointments.filter(appointment => appointment.patientId === parseInt(patientId));
    }

    getAppointmentsByDoctor(doctorId) {
        const appointments = this.getAll('appointments');
        return appointments.filter(appointment => appointment.doctorId === parseInt(doctorId));
    }

    getAppointmentsByDate(date) {
        const appointments = this.getAll('appointments');
        return appointments.filter(appointment => 
            appointment.appointmentDate.startsWith(date)
        );
    }

    getAppointmentsByStatus(status) {
        const appointments = this.getAll('appointments');
        return appointments.filter(appointment => appointment.status === status);
    }

    // Role and permission methods
    getRoleByName(name) {
        const roles = this.getAll('roles');
        return roles.find(role => role.name === name);
    }

    getPermissionsByRole(roleId) {
        const role = this.getById('roles', roleId);
        if (!role) return [];
        
        const allPermissions = this.getAll('permissions');
        return allPermissions.filter(permission => 
            role.permissions.includes(permission.name)
        );
    }

    // Log methods
    addLog(userId, action, description, level = 'INFO') {
        const logEntry = {
            userId: parseInt(userId),
            action,
            description,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1', // You can pass this as parameter if needed
            userAgent: 'Hospital Management System',
            level
        };
        
        return this.create('logs', logEntry);
    }

    getLogsByUser(userId) {
        const logs = this.getAll('logs');
        return logs.filter(log => log.userId === parseInt(userId));
    }

    getLogsByLevel(level) {
        const logs = this.getAll('logs');
        return logs.filter(log => log.level === level);
    }

    getLogsByDateRange(startDate, endDate) {
        const logs = this.getAll('logs');
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= new Date(startDate) && logDate <= new Date(endDate);
        });
    }

    // Statistics methods
    getStats() {
        const users = this.getAll('users');
        const patients = this.getAll('patients');
        const appointments = this.getAll('appointments');
        const departments = this.getAll('departments');

        return {
            users: {
                total: users.length,
                active: users.filter(u => u.isActive).length,
                inactive: users.filter(u => !u.isActive).length,
                byRole: this.groupBy(users, 'role')
            },
            patients: {
                total: patients.length,
                active: patients.filter(p => p.isActive).length,
                byGender: this.groupBy(patients, 'gender')
            },
            appointments: {
                total: appointments.length,
                byStatus: this.groupBy(appointments, 'status'),
                byDepartment: this.groupBy(appointments, 'department')
            },
            departments: {
                total: departments.length,
                active: departments.filter(d => d.isActive).length
            }
        };
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }

    // Backup and restore methods
    backup() {
        const tables = ['users', 'patients', 'appointments', 'roles', 'permissions', 'departments', 'logs'];
        const backup = {};
        
        tables.forEach(table => {
            backup[table] = this.getAll(table);
        });
        
        const backupPath = path.join(__dirname, 'backup', `backup_${Date.now()}.json`);
        const backupDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        return backupPath;
    }

    restore(backupPath) {
        try {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            
            Object.keys(backupData).forEach(table => {
                this.saveToFile(table, backupData[table]);
            });
            
            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }
}

module.exports = new JSONDatabase();
