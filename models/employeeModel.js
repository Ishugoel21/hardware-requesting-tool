// models/employeeModel.js

import { DataTypes } from 'sequelize';
import sequelize from '../models/sequelize.js';
import Department from './departmentModel.js';

const Employee = sequelize.define('Employee', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Name must not be empty',
      },
      isAlpha: {
        msg: 'Name must only contain letters',
      },
      len: {
        args: [2, 50],
        msg: 'Name must be between 2 and 50 characters long',
      },
    },
  },
  emp_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: () => `EMP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  },
  DOJ: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address',
      },
    },
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'departments', // Use the actual table name
      key: 'department_id',
    },
  },
}, {
  timestamps: true,
  tableName: 'employees',
});


// Hook to auto-update admin_id when an admin is created
Employee.addHook('afterCreate', async (createdEmployee) => {
  if (/admin/i.test(createdEmployee.role)) {
    try {
      await Department.update(
        { admin_id: createdEmployee.emp_id },
        { where: { department_id: createdEmployee.department_id } }
      );
      console.log(`Admin assigned successfully: ${createdEmployee.emp_id}`);
    } catch (error) {
      console.error('Failed to update admin_id in Department:', error.message);
    }
  }
});

export default Employee;
