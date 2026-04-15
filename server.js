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

startServer();
