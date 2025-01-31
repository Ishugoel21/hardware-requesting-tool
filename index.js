import express from 'express';
import mysqlx from '@mysql/xdevapi';
import { dbConfig } from './config/config.js';
import loginRoutes from './routes/loginRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import sequelize from './models/sequelize.js';

import Employee from './models/employeeModel.js';
import Department from './models/departmentModel.js';
import Stock from './models/stockModel.js';
import StockAssigned from './models/stockAssignedModel.js';

const PORT = process.env.PORT || 3000;

const start = async () => {
  const app = express();

  app.use(express.json());

  // MySQL session setup
  try {
    const session = await mysqlx.getSession({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
    });
    console.log('MySQL session established successfully ✔');
  } catch (error) {
    console.error('Error establishing MySQL session:', error.message);
    process.exit(1);
  }

  // Sync Sequelize models
  try {
    await sequelize.authenticate();
    console.log('Connected to the database successfully.');
    
    const models = sequelize.models;
    for (const modelName in models) {
      if (Object.hasOwnProperty.call(models, modelName)) {
        console.log(`Synchronizing table "${modelName}"...`);
        await models[modelName].sync({ alter: true });
        console.log(`Table "${modelName}" synchronized successfully.`);
      } else {
        console.error(`Failed to synchronize table "${modelName}" because it is undefined.`);
      }
    }
    
    console.log('Sequelize models synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing Sequelize models:', error.message);
    process.exit(1);
  }
  

  // Define associations
  Department.hasMany(Employee, { foreignKey: 'department_id',as: 'employees' });
  Employee.belongsTo(Department, { foreignKey: 'department_id' ,as: 'department'});





  console.log('Models and associations defined');

  // Register routes
  app.use('/api/login', loginRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/stocks', stockRoutes);
  app.use('/api/employees', employeeRoutes);

  // Catch-all route
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Start server
  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err.message);
    process.exit(1);
  }
};

start();
