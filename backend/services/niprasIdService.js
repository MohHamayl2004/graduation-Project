import Counter from "../models/Counter.js";

export async function allocateNiprasId({ session } = {}) {
  const counter = await Counter.findOneAndUpdate(
    { name: "niprasUser" }, { $inc: { sequence: 1 } },
    { new: true, upsert: true, ...(session ? { session } : {}) }
  );
  return `NIP-${String(counter.sequence).padStart(7, "0")}`;
}
