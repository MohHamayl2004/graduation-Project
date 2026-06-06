export const mongoConnectionOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
};

export const sanitizeMongoUri = (uri = "") => uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");

export const getMongoConnectionUris = () => {
  const srvUri = process.env.MONGO_URI?.trim();
  const standardUri = process.env.MONGO_URI_STANDARD?.trim();

  return {
    primaryUri: standardUri || srvUri,
    srvUri,
    standardUri
  };
};

export const isSrvDnsError = (uri = "", error = {}) => {
  if (!uri.startsWith("mongodb+srv://")) return false;
  return /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|ESERVFAIL/i.test(error.message || "");
};

