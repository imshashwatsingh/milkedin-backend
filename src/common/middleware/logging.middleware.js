/**
 * Logging Middleware
 * Logs incoming requests and outgoing responses for debugging and monitoring
 */
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  // Log response after it's finished
  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

export default loggingMiddleware;