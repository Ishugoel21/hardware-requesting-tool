import express from 'express';
import { authenticateJWT } from "../middleware/auth.js";
import { checkDynamicRole } from "../middleware/checkEmployeeRole.js";
import Department from "../models/departmentModel.js";
import Employee from "../models/employeeModel.js";

const router = express.Router();

// Function to validate department names
const validateDepartmentName = (name) => {
  const validDepartments = /^(HR|IT|Finance|Marketing|Sales|Operations|Engineering|Legal|Administration|SWE|PM)$/i;
  return validDepartments.test(name);
};

// Middleware to protect routes
router.use("/", authenticateJWT, checkDynamicRole(["superAdmin"]));

// Create a new department
router.post("/", async (req, res) => {
  try {
    const { department_name } = req.body;

    // Validate that only the department_name field is present
    const allowedFields = ["department_name"];
    const providedFields = Object.keys(req.body);

    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: "You are not allowed to enter other fields except department_name.",
      });
    }
    //deapartment_name is required
    if (!department_name) {
      return res.status(400).json({ error: "Department name is required." });
    }

    // Validate department name
    if (!validateDepartmentName(department_name)) {
      return res.status(400).json({
        error: "Invalid department name. Use names like HR, IT, Finance, etc.",
      });
    }

    // Check if the department already exists
    const existingDepartment = await Department.findOne({ where: { department_name } });
    if (existingDepartment) {
      return res.status(400).json({
        error: `The department "${department_name}" already exists.`,
      });
    }

    // Create the new department
    const department = await Department.create({ department_name });
    res.status(201).json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Get all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: Employee, as: "employees" }],
    });
    res.status(200).json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a department by ID
router.get("/:id", async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{ model: Employee, as: "employees" }],
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.status(200).json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a department
router.put("/:id", async (req, res) => {
  try {
    const { department_name } = req.body;

    // Validate that only the department_name field is present
    const allowedFields = ["department_name"];
    const providedFields = Object.keys(req.body);

    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: "You are not allowed to update any fields other than department_name.",
      });
    }
    //deapartment_name is required 
    if (!department_name) {
      return res.status(400).json({ error: "Department name is required." });
    }

    // Validate department name
    if (department_name && !validateDepartmentName(department_name)) {
      return res.status(400).json({
        error: "Invalid department name. Use names like HR, IT, Finance, etc.",
      });
    }

    // Check if department name already exists
    if (department_name) {
      const existingDepartment = await Department.findOne({ where: { department_name } });
      if (existingDepartment && existingDepartment.id !== req.params.id) {
        return res.status(400).json({
          error: `The department "${department_name}" already exists.`,
        });
      }
    }

    // Find the department to update
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Update the department with the new name (if provided)
    await department.update({ department_name });

    res.status(200).json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{ model: Employee, as: "employees" }],
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }
    if (department.employees && department.employees.length > 0) {
      return res.status(400).json({
        error: "Department cannot be deleted because it has associated employees.",
      });
    }
    await department.destroy();
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: `Cannot delete department: a foreign key constraint fails. The department has associated employees.`,
      });
    }
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
