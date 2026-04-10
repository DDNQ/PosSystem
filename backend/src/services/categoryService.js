const prisma = require("../config/prisma");

const formatCategory = (category) => ({
  id: category.id,
  name: category.name,
  description: category.description,
  isActive: category.isActive,
});

const getCategories = async () => {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return categories.map(formatCategory);
};

module.exports = {
  getCategories,
};
