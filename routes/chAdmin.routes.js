/**import express from "express";
import {
  Stock,
  Department,
  login, // Using the login model to fetch employees
  StockAssigned,
  employee
} from "../models/chAdmin.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateJWT } from "../middleware/auth.js";
import { sendEmail } from "../emailservice.js";
import { adminRoles, juniorAdminRoles, departmentRoles, employeeRoles } from "../rolesConfig.js";

const router = express.Router();

// Middleware to check employee role dynamically based on role category from rolesConfig.js
const checkEmployeeRole = (roleCategory) => (req, res, next) => {
  console.log('req.user:', req.user); // Debugging line

  try {
    let allowedRoles = [];

    // Ensure roleCategory is passed as an array
    if (!Array.isArray(roleCategory)) {
      return res.status(400).send({ error: "Role category must be an array" });
    }

    // Loop over role categories to fetch the corresponding roles
    roleCategory.forEach((role) => {
      if (role === "admin") {
        allowedRoles = [...allowedRoles, ...adminRoles];
      } else if (role === "juniorAdmin") {
        allowedRoles = [...allowedRoles, ...juniorAdminRoles];
      } else if (role === "department") {
        const departmentRole = departmentRoles[req.user.department];
        if (departmentRole) {
          allowedRoles.push(departmentRole);
        } else {
          return res.status(400).send({ error: "Invalid department" });
        }
      } else if (role === "employee") {
        allowedRoles = [...allowedRoles, ...employeeRoles];
      }
    });

    if (allowedRoles.length === 0) {
      return res.status(400).send({ error: "Invalid role category" });
    }

    // Check if the user's role matches the allowed roles
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).send({
      error: "Access denied: You do not have permission to perform this action.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
};

export { checkEmployeeRole };

// Middleware for calculating the date cutoff for 5 years
const calculateDateCutoff = () => {
  const currentDate = new Date();
  const cutoffDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 5));
  return cutoffDate;
};

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const employeeRecord = await login.findOne({ where: { email } });
    if (!employeeRecord) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, employeeRecord.password);
    if (!isPasswordValid) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: employeeRecord.email, role: employeeRecord.role, department: employeeRecord.department },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Stock routes
router.use("/stocks", authenticateJWT);

router.post("/stocks", checkEmployeeRole(["admin"]), async (req, res) => {
  try {
    const stock = await Stock.create(req.body);
    res.status(201).send(stock);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

router.get("/stocks", checkEmployeeRole(["admin"]), async (req, res) => {
  try {
    const stocks = await Stock.findAll();
    res.status(200).send(stocks);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.get("/stocks/:product_id", checkEmployeeRole(["admin"]), async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.product_id);
    if (stock) {
      res.status(200).send(stock);
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update stock route
router.put("/stocks/:id", async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).send({ error: "Stock not found" });

    const isSuperAdmin = req.user.role === "admin";
    const allowedFields = isSuperAdmin ? Object.keys(req.body) : ['product_quantity'];
    const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(403).send({ error: "You are not allowed to update stock." });
    }

    if (!isSuperAdmin && req.body.product_quantity > stock.product_quantity) {
      return res.status(400).send({
        error: `Requested quantity (${req.body.product_quantity}) exceeds available stock (${stock.product_quantity})`
      });
    }

    const [updated] = await Stock.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedStock = await Stock.findByPk(req.params.id);
      if (updatedStock.product_quantity === 0) {
        const currentAdmin = await login.findOne({
          where: { email: req.user.email }
        });

        if (!currentAdmin || !juniorAdminRoles.includes(currentAdmin.role)) {
          return res.status(403).send({ error: "You are not authorized to send stock alerts." });
        }

        const juniorAdminEmail = currentAdmin.email;
        const superAdminEmail = "goelishu868@gmail.com"; // You could fetch this dynamically

        const emailContent = `
          Dear Super Admin,

          The stock for product ID ${req.params.id} has reached a critical level of zero.

          Please review the stock status at your earliest convenience.

          Best regards,
          ${juniorAdminEmail}
        `;

        await sendEmail(superAdminEmail, "Stock Quantity Alert", emailContent, juniorAdminEmail);
      }
      res.status(200).send(updatedStock);
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.delete("/stocks/:id", checkEmployeeRole(["admin"]), async (req, res) => {
  try {
    const deleted = await Stock.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(200).send("Stock deleted successfully");
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Department routes
router.use("/departments", authenticateJWT, checkEmployeeRole(["admin"]));

router.post("/departments", async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).send(department);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

router.get("/departments", async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.status(200).send(departments);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.get("/departments/:id", async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (department) {
      res.status(200).send(department);
    } else {
      res.status(404).send({ error: "Department not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.put("/departments/:id", async (req, res) => {
  try {
    const [updated] = await Department.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedDepartment = await Department.findByPk(req.params.id);
      res.status(200).send(updatedDepartment);
    } else {
      res.status(404).send({ error: "Department not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.delete("/departments/:id", async (req, res) => {
  try {
    const deleted = await Department.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(200).send("Department deleted successfully");
    } else {
      res.status(404).send({ error: "Department not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});


// Stock assigned routes
router.use("/stocksAssigned", authenticateJWT); 

// POST: Assign stock (Only allowed for admin roles)
router.post("/stocksAssigned", checkEmployeeRole(["juniorAdmin"]), async (req, res) => {
  try {
    const stockAssigned = await StockAssigned.create(req.body);
    res.status(201).send(stockAssigned);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// GET: Retrieve stock assignment by ID (Only accessible by admin roles)
router.get("/stocksAssigned/:id", checkEmployeeRole(["admin","juniorAdmin"]), async (req, res) => {
  try {
    const stock = await StockAssigned.findByPk(req.params.id);
    if (stock) {
      res.status(200).send(stock);
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// PUT: Update stock assignment (Admins can update stock; junior admins can only update certain fields)
router.put("/stocksAssigned/:id", checkEmployeeRole(["admin", "juniorAdmin", "employee"]), async (req, res) => {
  try {
    const stockAssigned = await StockAssigned.findByPk(req.params.id);
    if (!stockAssigned) {
      return res.status(404).send({ error: "Stock not found." });
    }

    // Check if the current user has permission to update (admin roles only)
    const isAllowedToUpdate = adminRoles.includes(req.user.role);
    console.log(`User role: ${req.user.role}`);

    if (!isAllowedToUpdate) {
      const invalidFields = Object.keys(req.body).filter(field => field !== 'status');
      if (invalidFields.length > 0) {
        return res.status(403).send({ error: "You are not allowed to update stock." });
      }
    }

    // Update the stockAssigned record
    const [updated] = await StockAssigned.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedStockAssigned = await StockAssigned.findByPk(req.params.id);

      // If the status is defective, send an email to the junior admin
      if (updatedStockAssigned.status === "defective") {
        const currentAdmin = await login.findOne({ where: { email: req.user.email } });
        if (!currentAdmin) {
          console.error("No admin found with email: ", req.user.email);
          return res.status(403).send({ error: "No admin found for sending email." });
        }

        console.log("Admin Department: ", currentAdmin.department);

        const juniorAdminRole = departmentRoles[currentAdmin.department]; // Map department to junior admin role
        if (!juniorAdminRole) {
          console.error(`No junior admin role found for department: ${currentAdmin.department}`);
          return res.status(403).send({ error: `No junior admin role found for department: ${currentAdmin.department}` });
        }

        const juniorAdmin = await login.findOne({
          where: { role: juniorAdminRole },
          attributes: ['email']
        });

        if (!juniorAdmin) {
          console.error(`No junior admin found for department: ${currentAdmin.department}`);
          return res.status(403).send({ error: `No junior admin found for department: ${currentAdmin.department}` });
        }

        console.log(`Sending email to Junior Admin: ${juniorAdmin.email}`);

        const emailContent = `
          Dear Junior Admin,

          The stock assigned with ID ${req.params.id} has been marked as defective.

          Please review the stock status at your earliest convenience.

          Best regards,
          ${currentAdmin.email}
        `;

        try {
          await sendEmail(juniorAdmin.email, "Stock Status Alert", emailContent);
        } catch (emailErr) {
          console.error("Error sending email: ", emailErr);
          return res.status(500).send({ error: "Failed to send email" });
        }
      }

      // Return the updated stockAssigned record
      res.status(200).send(updatedStockAssigned);
    } else {
      res.status(404).send({ error: "Stock assigned not found" });
    }
  } catch (error) {
    console.error("Error in route handler:", error);
    res.status(500).send({ error: error.message });
  }
});

// DELETE: Remove stock assignment (Only allowed for admin roles)
router.delete("/stocksAssigned/:id", checkEmployeeRole(["admin"]), async (req, res) => {
  try {
    const deleted = await StockAssigned.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(200).send("Stock assigned deleted successfully");
    } else {
      res.status(404).send({ error: "Stock assigned not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// POST: Approve or reject asset requests (Only allowed for junior admin roles)
router.post("/stocksAssigned/:id/approve", checkEmployeeRole(["juniorAdmin"]), async (req, res) => {
  const { approved, rejectionReason } = req.body;
  const department = req.user.department;

  try {
    const stockAssigned = await StockAssigned.findByPk(req.params.id);
    if (!stockAssigned) return res.status(404).send({ error: "Stock not found." });

    // Find Junior Admin Email for the Department
    const juniorAdmin = await login.findOne({
      where: { role: `${department}Admin`, department },
      attributes: ['email']
    });

    const departmentAdminEmail = juniorAdmin ? juniorAdmin.email : null;

    if (!departmentAdminEmail) {
      return res.status(403).send({ error: `No junior admin found for department: ${department}` });
    }

    // Find Employee Email for the Department
    const employee = await login.findOne({
      where: { role: `${department}employee` },
      attributes: ['email']
    });

    const employeeEmail = employee ? employee.email : null;

    // Approve or Reject the Stock Request
    if (approved) {
      stockAssigned.status = "approved";
    } else {
      stockAssigned.status = "rejected";
      console.log(`Sending email to employee: ${employee.email}`);
      // Prepare rejection email content
      const emailContent = `
        Dear Employee,

        Your request for a defective asset (ID: ${req.params.id}) has been rejected by your department admin.
        Reason: ${rejectionReason}

        Best regards,
        ${departmentAdminEmail}
      `;

      // Send rejection email to employee
      if (employeeEmail) {
        await sendEmail(employeeEmail, "Asset Request Rejected", emailContent);
      } else {
        return res.status(404).send({ error: "Employee email not found." });
      }
    }

    // Save the updated stockAssigned status
    await stockAssigned.save();

    res.status(200).send(stockAssigned);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET: Admin's stock requests for all employees (Accessible only by admin roles)
router.get("/stocksAssigned/:id/departmentRequests", checkEmployeeRole(["admin","juniorAdmin"]), async (req, res) => {
  try {
    const stock = await StockAssigned.findByPk(req.params.id);
    if (stock) {
      res.status(200).send(stock);
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET: Employee's stock requests (Accessible only by employee roles)
router.get("/stocksAssigned/:id/myRequests", checkEmployeeRole(["employee"]), async (req, res) => {
  try {
    const stock = await StockAssigned.findByPk(req.params.id);
    if (stock) {
      res.status(200).send(stock);
    } else {
      res.status(404).send({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// POST: Create a new employee (Only allowed for admin roles)
router.post("/employee", authenticateJWT, checkEmployeeRole(["admin", "juniorAdmin"]), async (req, res) => {
  try {
    const newEmployee = await employee.create(req.body);
    res.status(201).send(newEmployee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(400).send({ error: error.message });
  }
});

// GET: Retrieve all employees
router.get("/employee", authenticateJWT,checkEmployeeRole(["admin", "juniorAdmin"]), async (req, res) => {
  try {
    const employees = await employee.findAll();
    res.status(200).send(employees);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET by ID: Retrieve a specific employee by ID
router.get("/employee/:id",authenticateJWT, checkEmployeeRole(["admin", "juniorAdmin"]), async (req, res) => {
  try {
    const employeeRecord = await employee.findByPk(req.params.id);
    if (employeeRecord) {
      res.status(200).send(employeeRecord);
    } else {
      res.status(404).send({ error: "Employee not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// PUT: Update an existing employee by ID
router.put("/employee/:id",authenticateJWT, checkEmployeeRole(["admin", "juniorAdmin"]), async (req, res) => {
try {
  const [updated] = await employee.update(req.body, { where: { id: req.params.id } });
  if (updated) {
    const updatedEmployee = await employee.findByPk(req.params.id);
    res.status(200).send(updatedEmployee);
  } else {
    res.status(404).send({ error: "Employee not found" });
  }
} catch (error) {
  res.status(500).send({ error: error.message });
}
});

// DELETE: Remove an employee by ID
router.delete("/employee/:id",authenticateJWT, checkEmployeeRole(["admin"]), async (req, res) => {
try {
  const deleted = await employee.destroy({ where: { id: req.params.id } });
  if (deleted) {
    res.status(200).send("Employee deleted successfully");
  } else {
    res.status(404).send({ error: "Employee not found" });
  }
} catch (error) {
  res.status(500).send({ error: error.message });
}
});

// GET employees with more than 5 years at the company
router.get("/employee/longTerm", authenticateJWT, checkEmployeeRole(["admin"]), async (req, res) => {
try {
  const cutoffDate = calculateDateCutoff(); // Helper function to calculate 5 years ago
  const longTermEmployees = await employee.findAll({
    where: { DOJ: { [Op.lt]: cutoffDate } }
  });
  res.status(200).send(longTermEmployees);
} catch (error) {
  res.status(500).send({ error: error.message });
}
});

// Route to fetch devices needing repair assigned to employees with more than 5 years at the company
router.get("/devices/needs-repair",authenticateJWT, checkEmployeeRole(["admin"]), async (req, res) => {
try {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const devicesNeedingRepair = await StockAssigned.findAll({
    where: { status: "defective" },
    include: [{
      model: employee,
      where: { DOJ: { [Op.lt]: fiveYearsAgo } },
      attributes: ['name', 'emp_id', 'DOJ', 'email', 'role']
    }]
  });

  if (devicesNeedingRepair.length === 0) {
    return res.status(404).send({ message: "No devices needing repair found." });
  }

  res.status(200).send(devicesNeedingRepair);
} catch (error) {
  res.status(500).send({ error: error.message });
}
});

export default router;**/