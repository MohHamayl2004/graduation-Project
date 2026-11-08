import dns from "dns";

// Use the system DNS servers; public resolvers may be blocked by the network.
dns.setDefaultResultOrder("ipv4first");
