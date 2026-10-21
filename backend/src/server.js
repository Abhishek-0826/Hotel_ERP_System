const app  = require("./app");
const env = require("./config/env");
const PORT = env.port;
const HOST = "0.0.0.0"; // Bind to all interfaces — required behind ALB

const server = app.listen(PORT, HOST, () => {
    console.log(JSON.stringify({
        level:   "info",
        event:   "server_started",
        host:    HOST,
        port:    PORT,
        env:     env.nodeEnv,
        ts:      new Date().toISOString(),
    }));
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
    server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
