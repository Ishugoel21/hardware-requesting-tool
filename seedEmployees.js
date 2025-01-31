import { sequelize } from './models/sequelize.js'; // Import Sequelize instance
import { Login } from './models/loginModel.js'; // Import the Login model
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const users = [
  {
    email: 'employee1@gmail.com',
    password: 'ishu@12',
    role: 'Admin',
    department: 'SWE',
  },
  {
    email: 'ishu868@gmail.com',
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
  // Ensure the Login model is initialized with Sequelize
  const LoginModel = Login;

  // Loop through the users and seed them
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10); // Hash the password
    try {
      // Check if the user already exists by email
      const existingUser = await LoginModel.findOne({ where: { email: user.email } });

      if (existingUser) {
        console.log(`User with email ${user.email} already exists. No new user created.`);
        continue; // Skip creating the user if they already exist
      }

      // Create the new user in the database
      await LoginModel.create({
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

  // Close the database connection after seeding is complete
  await sequelize.close();
};

// Run the seed function
seedUsers();
