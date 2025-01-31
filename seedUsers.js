import sequelize from './models/sequelize.js'; // Import your sequelize instance
import { Login } from './models/loginModel.js'; // Adjust the path as needed
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const users = [
  {
    email: 'ishu656@gmail.com',
    password: 'ishu@12',
    role: 'Admin',
    department: 'SWE',
  },
  {
    email: 'goelishu868@gmail.com',
    password: 'ishu@123#$',
    role: 'superAdmin',
    department: 'company head Admin',
  },
  {
    email: 'ishu435@gmail.com',
    password: 'ishu@123',
    role: 'Admin',
    department: 'HR',
  },
  {
    email: 'ishu765@gmail.com',
    password: 'ishu@86',
    role: 'Admin',
    department: 'PM',
  },
];

const seedUsers = async () => {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    try {
      // Check if the user already exists
      const existingUser = await Login.findOne({ where: { email: user.email } });
      if (existingUser) {
        console.log(`User with email ${user.email} already exists. No new user created.`);
        continue;
      }

      // Create the new user
      await Login.create({
        email: user.email,
        password: hashedPassword,
        role: user.role,
        department: user.department,
      });
      console.log(`Default user created successfully: ${user.email}`);
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  }

  // Close the database connection
  await sequelize.close();
};

// Run the seed function
seedUsers();
