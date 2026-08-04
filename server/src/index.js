require("dotenv").config({ path: __dirname + "/../.env" });
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { connectDB, prisma } = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const logRoutes = require("./routes/logRoutes");
const userRoutes = require("./routes/userRoutes");
const publicRoutes = require("./routes/publicRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");

const app = express();
app.set("trust proxy", 1); // trust first proxy (Nginx)

// Warn if CLIENT_URL is still pointing to localhost in a non-dev environment
if (process.env.NODE_ENV === 'production' && process.env.CLIENT_URL?.includes('localhost')) {
    console.warn('[WARN] CLIENT_URL is set to localhost but NODE_ENV=production. Email links will be broken.');
}
const httpServer = http.createServer(app);

// Parse allowed origins from env (comma-separated)
// Comma-separated. Dev: http://localhost:5173  Prod: your deployed frontend origin.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(
    `[WS] Client connected: ${socket.id} (user: ${socket.user?.id || "unknown"})`,
  );

  // Client sends 'join:workspace' to subscribe to workspace-scoped events
  socket.on("join:workspace", async (workspaceId) => {
    if (!workspaceId) return;
    // Leave any previous workspace rooms first
    [...socket.rooms].forEach((room) => {
      if (room.startsWith("workspace:")) socket.leave(room);
    });
    socket.join(`workspace:${workspaceId}`);
    // Personal room for targeted events (e.g. lead assigned to this user)
    socket.join(`workspace:${workspaceId}:user:${socket.user.id}`);
    // Admin room — only joined if the user is a workspace admin
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: parseInt(workspaceId),
            userId: parseInt(socket.user.id),
          },
        },
      });
      if (member?.role === "admin") {
        socket.join(`workspace:${workspaceId}:admin`);
      }
    } catch (e) {
      console.error("[WS] Role lookup failed:", e.message);
    }
    console.log(`[WS] ${socket.id} joined workspace:${workspaceId}`);
  });

  socket.on("leave:workspace", (workspaceId) => {
    socket.leave(`workspace:${workspaceId}`);
    socket.leave(`workspace:${workspaceId}:admin`);
    socket.leave(`workspace:${workspaceId}:user:${socket.user.id}`);
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Make io accessible in controllers via req.app.locals.io
app.locals.io = io;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow public asset fetching
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Public lead-submission endpoint: open to any origin (external sites/backends)
const openCors = cors({
  origin: "*",
  methods: ["POST", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "x-api-key",
    "x-workspace-id",
    "Authorization",
  ],
});
app.use("/api/public", openCors);
app.options("/api/public/*", openCors); // pre-flight

// All other routes: restricted to allowed dashboard origins (same list as Socket.IO)

const dashboardCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
});
app.use(dashboardCors);

app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/users", userRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/workspaces", workspaceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5003;

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO active on port ${PORT}`);
  });
};

start();
