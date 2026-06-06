import "./config/dns.js";
import "./config/env.js";
import mongoose from "mongoose";
import {
  getMongoConnectionUris,
  isSrvDnsError,
  mongoConnectionOptions,
  sanitizeMongoUri
} from "./config/mongoConfig.js";

const connectWithUri = async (uri, label) => {
  console.log(`MongoDB connection mode: ${label}`);
  console.log(`MongoDB URI: ${sanitizeMongoUri(uri)}`);
  await mongoose.connect(uri, mongoConnectionOptions);
};

const { primaryUri, srvUri, standardUri } = getMongoConnectionUris();

console.log(`Node version: ${process.version}`);
console.log(`MONGO_URI loaded: ${Boolean(srvUri)}`);
console.log(`MONGO_URI_STANDARD loaded: ${Boolean(standardUri)}`);

if (!primaryUri) {
  console.error("Exact error: MONGO_URI or MONGO_URI_STANDARD is missing from backend/.env");
  process.exit(1);
}

try {
  await connectWithUri(primaryUri, standardUri ? "standard mongodb:// preferred" : "srv mongodb+srv://");
  console.log("Connected successfully");
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Exact error:", error);

  if (isSrvDnsError(primaryUri, error)) {
    console.error("Atlas SRV DNS lookup failed in Node.");

    if (standardUri && standardUri !== primaryUri) {
      try {
        await connectWithUri(standardUri, "standard mongodb:// fallback");
        console.log("Connected successfully");
        await mongoose.disconnect();
        process.exit(0);
      } catch (fallbackError) {
        console.error("Standard URI fallback error:", fallbackError);
      }
    }
  }

  process.exit(1);
}

