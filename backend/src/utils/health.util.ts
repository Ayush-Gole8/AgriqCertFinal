import os from "os";
import mongoose from "mongoose";

export const collectHealthData = async () => {
  const memory = process.memoryUsage();
  const dbState = mongoose.connection.readyState;

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),

    system: {
      platform: process.platform,
      arch: process.arch,
      cpuLoad: os.loadavg(),
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    },

    process: {
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
    },

    database: {
      connected: dbState === 1,
      state: dbState, // 0=disconnected, 1=connected
      name: mongoose.connection.name || null,
    },
  };
};
