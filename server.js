import "dotenv/config";
import app from "./src/app.js";
import postgres from "./src/common/config/db.js";
import { initializeEmailService } from "./src/common/utils/emailInitializer.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize email service
    await initializeEmailService();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Export the Express app for serverless platforms (e.g. Vercel @vercel/node),
// which invoke the default export as a request handler.
export default app;

// Only start the HTTP listener when executed directly (local dev / `npm start`).
// When imported as a serverless handler, we must NOT call app.listen().
import { pathToFileURL } from "url";
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer();
}
