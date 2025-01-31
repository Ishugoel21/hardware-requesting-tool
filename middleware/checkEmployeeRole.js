import { Login } from "../models/loginModel.js";

const checkDynamicRole = (allowedRoles) => async (req, res, next) => {
  try {
    // Ensure allowedRoles is an array
    if (!Array.isArray(allowedRoles)) {
      return res.status(400).send({ error: "Allowed roles must be an array." });
    }

    const user = req.user;

    // Check if the user is attached to the request and has a role
    if (!user || !user.role) {
      console.log('User not found in request:', user);
      return res.status(401).send({ error: "Unauthorized: User not found." });
    }

    // Fetch the user from the database (assuming email is not in the JWT payload)
    const dbUser = await Login.findOne({ where: { id: user.id } });  // Using `id` instead of `email` if JWT doesn't contain email

    // If the user is not found in the database, return an error
    if (!dbUser) {
      console.log('User not found in the database:', user.id);
      return res.status(404).send({ error: "User not found in the database." });
    }

    // Check if the user's role matches one of the allowed roles
    if (allowedRoles.includes(dbUser.role)) {
      req.userDetails = dbUser;  // Attach user data to req.userDetails
      return next();
    }

    // If the user's role doesn't match, deny access
    res.status(403).send({
      error: "Access denied: You do not have permission to perform this action.",
    });
  } catch (error) {
    console.error("Error in checkDynamicRole middleware:", error);
    res.status(500).send({ error: "Internal server error." });
  }
};

export { checkDynamicRole };
