import mongoose from "mongoose";
import {
  getMongoConnectionUris,
  isSrvDnsError,
  mongoConnectionOptions,
  sanitizeMongoUri
} from "./mongoConfig.js";

const connectWithUri = async (uri, label) => {
  console.log(`MongoDB connection mode: ${label}`);
  console.log(`MongoDB URI: ${sanitizeMongoUri(uri)}`);

  await mongoose.connect(uri, mongoConnectionOptions);
};

const connectDB = async () => {
  const { primaryUri, srvUri, standardUri } = getMongoConnectionUris();

  if (!primaryUri) {
    throw new Error("MONGO_URI or MONGO_URI_STANDARD is required. Add one to backend/.env before starting the API.");
  }

  console.log(`MONGO_URI loaded: ${Boolean(srvUri)}`);
  console.log(`MONGO_URI_STANDARD loaded: ${Boolean(standardUri)}`);

  mongoose.set("strictQuery", true);

  try {
    await connectWithUri(primaryUri, standardUri ? "standard mongodb:// preferred" : "srv mongodb+srv://");
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);

    if (isSrvDnsError(primaryUri, error)) {
      console.error(
        "Atlas SRV DNS lookup failed in Node. Retrying with MONGO_URI_STANDARD if it is configured."
      );

      if (standardUri && standardUri !== primaryUri) {
        await connectWithUri(standardUri, "standard mongodb:// fallback");
        console.log("MongoDB connected successfully");
        return;
      }
    }

    throw error;
  }
};

export default connectDB;

