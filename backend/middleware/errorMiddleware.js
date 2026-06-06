export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  if (error.name === "MulterError" || error.message === "Unsupported file type") {
    return res.status(400).json({ message: error.message });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  return res.status(statusCode).json({
    message: error.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
};
