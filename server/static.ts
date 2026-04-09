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

  const landingPath = path.resolve(distPath, "landing", "index.html");
  const spaPath = path.resolve(distPath, "index.html");

  // IMPORTANT: Define explicit routes BEFORE express.static
  // Otherwise express.static serves index.html for / automatically

  // Root → Oleg's landing page
  app.get("/", (_req, res) => {
    if (fs.existsSync(landingPath)) {
      res.sendFile(landingPath);
    } else {
      res.sendFile(spaPath);
    }
  });

  // Oleg's client-side routes → landing page
  ["/register", "/login", "/expert", "/cookies", "/privacy", "/terms", "/payments"].forEach(route => {
    app.get(route, (_req, res) => {
      if (fs.existsSync(landingPath)) {
        res.sendFile(landingPath);
      } else {
        res.sendFile(spaPath);
      }
    });
  });

  // Static files (JS, CSS, images, PDFs — but NOT index.html at root)
  app.use(express.static(distPath, { index: false }));

  // All other routes → SPA (our React app with hash routing)
  app.use("/{*path}", (_req, res) => {
    res.sendFile(spaPath);
  });
}
