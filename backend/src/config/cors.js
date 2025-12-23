const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
];

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check for Vercel preview URLs
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    const msg =
      "The CORS policy for this site does not allow access from the specified Origin.";
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
};
