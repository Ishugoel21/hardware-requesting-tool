import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Login } from '../models/loginModel.js';
import Department from '../models/departmentModel.js';

const router = express.Router();

// ✅ Helper: Validate Admin's Department Matches
const validateAdminDepartmentMatch = async (adminEmail, targetDepartmentId) => {
  try {
    const admin = await Login.findOne({ where: { email: adminEmail, role: "Admin" } });

    if (!admin) {
      throw new Error("Unauthorized: Only Admins can perform this action.");
    }

    const targetDepartment = await Department.findOne({ where: { department_id: targetDepartmentId } });

    if (!targetDepartment) {
      throw new Error("Target department not found.");
    }

    // Ensure Admin's department matches the target department
    return admin.department === targetDepartment.department_name;
  } catch (error) {
    console.error("Error validating admin's department:", error);
    throw error;
  }
};

// ✅ POST: User Login
router.post('/', async (req, res) => {
  const { email, password, targetDepartmentId } = req.body;

  try {
    // 🔍 Check if user exists
    const user = await Login.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔑 Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🛡️ Generate JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // If targetDepartmentId is provided, validate the admin's department
    if (targetDepartmentId) {
      const isAdminAuthorized = await validateAdminDepartmentMatch(user.email, targetDepartmentId);
      if (!isAdminAuthorized) {
        return res.status(403).json({ error: 'Admin is not authorized to manage this department.' });
      }
    }

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
