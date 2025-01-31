import { DataTypes } from 'sequelize';
import sequelize from '../models/sequelize.js';

const Department = sequelize.define(
  'Department',
  {
    department_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => `DEPT-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substr(2, 4)
        .toUpperCase()}`,
    },
    department_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Department name cannot be empty',
        },
        isAlpha: {
          msg: 'Department name must only contain letters',
        },
        len: {
          args: [2, 50],
          msg: 'Department name must be between 2 and 50 characters long',
        },
      },
    },
    admin_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    tableName: 'departments',
  }
);

export default Department;
