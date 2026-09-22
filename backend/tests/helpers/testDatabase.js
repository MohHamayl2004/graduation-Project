import mongoose from "mongoose";

const databaseName = (uri) => new URL(uri).pathname.replace(/^\//, "").split("/")[0];

export async function connectTestDatabase(env = process.env) {
  const uri = env.MONGO_URI_TEST;
  if (!uri) throw new Error("MONGO_URI_TEST is required for database integration tests");
  if (env.NODE_ENV !== "test") throw new Error("NODE_ENV=test is required for destructive test cleanup");
  if (!/test/i.test(databaseName(uri))) throw new Error(`Refusing destructive cleanup for non-test database: ${databaseName(uri)}`);
  await mongoose.connect(uri);
}

export async function clearTestCollections() {
  if (process.env.NODE_ENV !== "test" || !/test/i.test(mongoose.connection.name || "")) throw new Error("Refusing destructive cleanup for non-test database");
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

export const disconnectTestDatabase = () => mongoose.disconnect();
