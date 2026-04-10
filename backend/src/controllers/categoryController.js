const categoryService = require("../services/categoryService");

const getCategories = async (_req, res, next) => {
  try {
    const categories = await categoryService.getCategories();

    res.status(200).json({
      categories,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
};
