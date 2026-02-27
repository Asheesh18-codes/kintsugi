import express from "express";
import cors from "cors";
import simulateRouter from "./routes/simulate.js";
import mirrorRouter from "./routes/mirror.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50kb" }));

app.use("/api/simulate", simulateRouter);
app.use("/api/mirror", mirrorRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Kintsugi API server running on http://localhost:${PORT}`);
});
