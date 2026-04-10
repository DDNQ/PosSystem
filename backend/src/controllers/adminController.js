const adminService = require("../services/adminService");

const getAdminSalesOverview = async (_req, res, next) => {
  try {
    const salesOverview = await adminService.getAdminSalesOverview();

    res.status(200).json(salesOverview);
  } catch (error) {
    next(error);
  }
};

const getAdminUsersOverview = async (_req, res, next) => {
  try {
    const usersOverview = await adminService.getAdminUsersOverview();

    res.status(200).json(usersOverview);
  } catch (error) {
    next(error);
  }
};

const createAdminUser = async (req, res, next) => {
  try {
    const user = await adminService.createAdminUser(req.user, req.body);

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminSalesOverview,
  getAdminUsersOverview,
  createAdminUser,
};
