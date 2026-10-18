import "./config/dns.js";
import "./config/env.js";
import { createApp } from "./app.js";
import connectDB from "./config/db.js";
import { maintainSubscriptions } from "./services/subscriptionMaintenance.js";
import Payment from "./models/Payment.js";
import StudyPlan from "./models/StudyPlan.js";

const PORT = process.env.PORT || 5000;
const app = createApp();

const startServer = async () => {
  console.log(`Node version: ${process.version}`);
  await connectDB();
  await Payment.init();
  await StudyPlan.init();
  await maintainSubscriptions();
  const maintenance = setInterval(() => maintainSubscriptions().catch((error) => console.error("Subscription maintenance:", error.message)), 60000);
  maintenance.unref();
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  server.on("error", (error) => {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Failed to start NIPRAS API:", error.message);
  process.exit(1);
});
