import cors from "cors";

const getAllowedOrigins = () => {
  const defaultOrigins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  
  if (process.env.ALLOWED_ORIGINS) {
    return [
      ...process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
      ...defaultOrigins,
    ];
  }
  
  return defaultOrigins;
};

const allowedOrigins = getAllowedOrigins();

export default cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
});
