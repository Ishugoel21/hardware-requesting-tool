import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js'; // Adjust the path as needed

const Login = sequelize.define('Login', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export { Login };
