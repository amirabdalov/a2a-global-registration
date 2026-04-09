import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve landing page at root
  app.get("/", (_req, res) => {
    const landingPath = path.resolve(distPath, "landing", "index.html");
    if (fs.existsSync(landingPath)) {
      res.sendFile(landingPath);
    } else {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });

  // Oleg's client-side routes — serve landing page (React Router handles them)
  // BUT /register and /login get redirected to our hash auth by the landing JS
  const landingRoutes = ["/register", "/login", "/expert", "/cookies", "/privacy", "/terms", "/payments"];
  landingRoutes.forEach(route => {
    app.get(route, (_req, res) => {
      const landingPath = path.resolve(distPath, "landing", "index.html");
      if (fs.existsSync(landingPath)) {
        res.sendFile(landingPath);
      } else {
        res.sendFile(path.resolve(distPath, "index.html"));
      }
    });
  });

  // All other routes fall through to our React app (hash-based routing)
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
