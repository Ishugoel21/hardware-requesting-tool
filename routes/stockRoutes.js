import express from "express";
import Stock from "../models/stockModel.js"; // Default import for Stock
import { authenticateJWT } from "../middleware/auth.js";
import { sendEmail } from "../emailservice.js";
import { checkDynamicRole } from "../middleware/checkEmployeeRole.js";

const router = express.Router();

// Middleware to protect stock routes
router.use("/stocks", authenticateJWT);

// Create a stock item (Restricted to "superAdmin")
router.post("/stocks", checkDynamicRole(["superAdmin"]), async (req, res) => {
  try {
    const { product_name, product_quantity, product_type, product_company } = req.body;

    if (!product_name || !product_quantity || !product_type ||!product_company) {
      return res.status(400).json({
        error: "Product name, quantity,company and type are required.",
      });
    }

    const stock = await Stock.create(req.body);
    res.status(201).json(stock);
  } catch (error) {
    console.error("Error creating stock:", error);
    res.status(400).json({ error: error.message });
  }
});

// Retrieve all stock items (Restricted to "superAdmin")
router.get("/stocks", checkDynamicRole(["superAdmin"]), async (req, res) => {
  try {
    const stocks = await Stock.findAll();
    res.status(200).json(stocks);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Retrieve a single stock item by `product_id`
router.get("/stocks/:product_id", checkDynamicRole(["superAdmin"]), async (req, res) => {
  try {
    const stock = await Stock.findOne({ where: { product_id: req.params.product_id } });
    if (stock) {
      res.status(200).json(stock);
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (error) {
    console.error("Error fetching stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update stock item by ID
router.put("/stocks/:id", async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const isSuperAdmin = req.user.role === "superAdmin";
    const allowedFields = isSuperAdmin
      ? Object.keys(req.body)
      : ["product_quantity"];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(403).json({ error: "You are not allowed to update these fields." });
    }

    if (!isSuperAdmin && req.body.product_quantity > stock.product_quantity) {
      return res.status(400).json({
        error: `Requested quantity (${req.body.product_quantity}) exceeds available stock (${stock.product_quantity})`,
      });
    }

    await stock.update(req.body);

    // Notify super admin if stock quantity is zero
    if (stock.product_quantity === 0) {
      const superAdminEmail = "goelishu868@gmail.com"; // Replace with dynamic fetch if necessary
      const emailContent = `
        Dear Super Admin,

        The stock for product ID ${stock.product_id} has reached a critical level of zero.

        Please review the stock status at your earliest convenience.

        Best regards,
        ${req.user.email}
      `;

      await sendEmail(superAdminEmail, "Stock Quantity Alert", emailContent);
    }

    res.status(200).json(stock);
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete stock item by ID (Restricted to "superAdmin")
router.delete("/stocks/:id", checkDynamicRole(["superAdmin"]), async (req, res) => {
  try {
    const deleted = await Stock.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(200).json({ message: "Stock deleted successfully" });
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (error) {
    console.error("Error deleting stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
