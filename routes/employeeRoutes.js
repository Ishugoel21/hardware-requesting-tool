import express from 'express';
import { authenticateJWT } from "../middleware/auth.js";
import { checkDynamicRole } from "../middleware/checkEmployeeRole.js";
import Employee from "../models/employeeModel.js";
import Department from "../models/departmentModel.js";

const router = express.Router();

// Helper: Validate employee name
const validateEmployeeName = (name) => /^[A-Za-z\s'-]+$/.test(name);

// Helper: Validate role
const validateRole = (role) => /^(admin|[a-zA-Z]+)$/i.test(role);

// Helper: Validate department_id
const validateDepartmentId = async (department_id) => {
  const isValidFormat = /^[A-Z0-9-]+$/.test(department_id);
  if (!isValidFormat) return false;

  const department = await Department.findOne({ where: { department_id } });
  return department !== null;
};

// Helper: Check if an Admin already exists in the department
const isAdminAlreadyInDepartment = async (department_id) => {
  const existingAdmin = await Employee.findOne({
    where: { department_id, role: "Admin" },
  });
  return existingAdmin !== null;
};

// Helper: Validate Role and Department Match
const validateRoleDepartmentMatch = async (role, department_id, userDepartmentName) => {
  const department = await Department.findOne({ where: { department_id } });
  if (!department) {
    return false;
  }

  if (role === "Admin") {
    if (userDepartmentName !== department.department_name) {
      return false; 
    }
  }

  if (role !== "Admin" && userDepartmentName !== department.department_name) {
    return false;
  }

  return true;
};
const isDuplicateEmail = async (email) => {
  const existingEmployee = await Employee.findOne({ where: { email } });
  return existingEmployee !== null;
};

// POST: Create a new employee
router.post(
  "/",
  authenticateJWT,
  checkDynamicRole(["Admin"]),
  async (req, res) => {
    try {
      const { name, DOJ, email, role, department_id } = req.body;
      const { role: userRole, department: userDepartmentName } = req.user;

      if (!validateEmployeeName(name)) {
        return res.status(400).send({
          error: "Invalid name. Only letters, spaces, and hyphens are allowed.",
        });
      }
      if (!name || !DOJ || !email || !role || !department_id) {
        return res.status(400).send({ error: "All fields are required." });
      }

      if (!validateRole(role)) {
        return res.status(400).send({ error: "Role must be valid." });
      }

      if (!(await validateDepartmentId(department_id))) {
        return res.status(400).send({ error: "Invalid department ID." });
      }

      const isValidRoleDepartmentMatch = await validateRoleDepartmentMatch(userRole, department_id, userDepartmentName);
      if (!isValidRoleDepartmentMatch) {
        return res.status(403).send({
          error: "You are not authorized to create an employee in this department.",
        });
      }

      if (role === "Admin" && await isAdminAlreadyInDepartment(department_id)) {
        return res.status(400).send({
          error: "An Admin already exists for this department.",
        });
      }

      const existingEmployee = await Employee.findOne({ where: { email } });
      if (existingEmployee) {
        return res.status(400).send({ error: "An employee with this email already exists." });
      }

      const departmentRoleMatch = department_id === userDepartmentName || role !== "Admin";
      if (!departmentRoleMatch) {
        return res.status(403).send({ error: "Role and Department do not match." });
      }
      if (await isDuplicateEmail(email)) {
        return res.status(400).send({ error: "Email already exists." });
      }
      

      const newEmployee = await Employee.create({
        name,
        DOJ,
        email,
        role,
        department_id,
      });

      res.status(201).send(newEmployee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(400).send({ error: error.message });
    }
  }
);

// GET: Retrieve a specific employee's details
router.get(
  "/:id",
  authenticateJWT,
  checkDynamicRole(["superAdmin", "Admin"]),
  async (req, res) => {
    try {
      const { role: userRole, department: userDepartmentName } = req.user;
      const { id } = req.params;

      // Get employee by ID
      const employee = await Employee.findOne({ where: { id } });
      if (!employee) {
        return res.status(404).send({ error: "Employee not found." });
      }

      // If the user is an Admin, check if they can access the employee from their department
      if (userRole === "Admin" && employee.department_id !== userDepartmentName) {
        return res.status(403).send({
          error: "You are not authorized to access employees from other departments.",
        });
      }

      // Return employee details if everything is correct
      res.status(200).send(employee);
    } catch (error) {
      console.error("Error retrieving employee:", error);
      res.status(500).send({ error: "Internal server error. Please try again later." });
    }
  }
);

// PUT: Update an employee's details
router.put(
  "/:id",
  authenticateJWT,
  checkDynamicRole(["superAdmin", "Admin"]),
  async (req, res) => {
    const { id } = req.params;
    const { name, DOJ, email, role, department_id } = req.body;
    const { role: userRole, department: userDepartmentName } = req.user;

    try {
      const employee = await Employee.findByPk(id);

      if (!employee) {
        return res.status(404).send({ error: "Employee not found." });
      }
      if (!name || !DOJ || !email || !role || !department_id) {
        return res.status(400).send({ error: "All fields are required." });
      }

      const isValidRoleDepartmentMatch = await validateRoleDepartmentMatch(userRole, department_id || employee.department_id, userDepartmentName);
      if (!isValidRoleDepartmentMatch) {
        return res.status(403).send({
          error: "You are not authorized to update an employee in this department.",
        });
      }

      if (role === "Admin" && (department_id || employee.department_id)) {
        if (await isAdminAlreadyInDepartment(department_id || employee.department_id)) {
          return res.status(400).send({
            error: "An Admin already exists for this department.",
          });
        }
      }
      if (await isDuplicateEmail(email)) {
        return res.status(400).send({ error: "Email already exists." });
      }
      

      await employee.update({
        name,
        DOJ,
        email,
        role,
        department_id,
      });

      res.status(200).send(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(400).send({ error: error.message });
    }
  }
);

// DELETE: Delete an employee
router.delete(
  "/:id",
  authenticateJWT,
  checkDynamicRole(["superAdmin", "Admin"]),
  async (req, res) => {
    const { id } = req.params;
    const { role: userRole, department: userDepartmentName } = req.user;

    try {
      const employee = await Employee.findByPk(id);
      if (!employee) {
        return res.status(404).send({ error: "Employee not found." });
      }

      if (userRole === "Admin" && employee.department_id !== userDepartmentName) {
        return res.status(403).send({
          error: "You are not authorized to delete employees from this department.",
        });
      }

      const deleted = await Employee.destroy({ where: { id } });

      if (deleted) {
        res.status(200).send({ message: "Employee deleted successfully." });
      } else {
        res.status(404).send({ error: "Employee not found." });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).send({ error: error.message });
    }
  }
);

export default router;
