// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  leads;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.leads = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createLead(insertLead) {
    const id = randomUUID();
    const lead = {
      ...insertLead,
      company: insertLead.company || null,
      message: insertLead.message || null,
      getConsultation: insertLead.getConsultation || null,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.leads.set(id, lead);
    return lead;
  }
  async getLeads() {
    return Array.from(this.leads.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
  async getLead(id) {
    return this.leads.get(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  message: text("message"),
  getConsultation: text("get_consultation").default("false"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertLeadSchema = createInsertSchema(leads).pick({
  name: true,
  company: true,
  phone: true,
  email: true,
  message: true,
  getConsultation: true
}).extend({
  phone: z.string().min(10, "\u041D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 10 \u0446\u0438\u0444\u0440"),
  email: z.string().email("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 email \u0430\u0434\u0440\u0435\u0441"),
  name: z.string().min(2, "\u0418\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u0441\u0438\u043C\u0432\u043E\u043B\u0430"),
  company: z.string().optional(),
  message: z.string().optional()
});

// server/routes.ts
import { z as z2 } from "zod";
import nodemailer from "nodemailer";
async function registerRoutes(app2) {
  const transporter = nodemailer.createTransport({
    host: "smtp.jino.ru",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASS || ""
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    // Включаем отладку
    logger: true
    // Включаем логирование
  });
  app2.post("/api/leads", async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(leadData);
      const emailContent = `
        <h2>\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u044F\u0432\u043A\u0430 \u0441 \u0441\u0430\u0439\u0442\u0430</h2>
        <p><strong>\u0418\u043C\u044F:</strong> ${leadData.name}</p>
        <p><strong>\u041A\u043E\u043C\u043F\u0430\u043D\u0438\u044F:</strong> ${leadData.company || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"}</p>
        <p><strong>\u0422\u0435\u043B\u0435\u0444\u043E\u043D:</strong> ${leadData.phone}</p>
        <p><strong>Email:</strong> ${leadData.email}</p>
        <p><strong>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435:</strong> ${leadData.message || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}</p>
        <p><strong>\u0414\u0430\u0442\u0430:</strong> ${(/* @__PURE__ */ new Date()).toLocaleString("ru-RU")}</p>
      `;
      const mailOptions = {
        from: "info@aideploy.ru",
        to: "marakoris@gmail.com",
        subject: `\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u044F\u0432\u043A\u0430 \u043E\u0442 ${leadData.name}`,
        html: emailContent
      };
      const clientEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">\u2705 \u0412\u0430\u0448\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u0430!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              \u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, <strong>${leadData.name}</strong>!
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              \u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \u043A \u043D\u0430\u043C! \u0412\u0430\u0448\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u0438 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u0430 \u043D\u0430\u0448\u0438\u043C \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0430\u043C.  
              \u041C\u044B \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0441\u0432\u044F\u0436\u0435\u043C\u0441\u044F \u0441 \u0432\u0430\u043C\u0438 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F \u0434\u043B\u044F \u043E\u0431\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u044F \u0434\u0435\u0442\u0430\u043B\u0435\u0439.
            </p>
            
            <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">\u{1F4CB} \u0414\u0435\u0442\u0430\u043B\u0438 \u0432\u0430\u0448\u0435\u0439 \u0437\u0430\u044F\u0432\u043A\u0438:</h3>
              <p style="margin: 5px 0;"><strong>\u0418\u043C\u044F:</strong> ${leadData.name}</p>
              <p style="margin: 5px 0;"><strong>\u0422\u0435\u043B\u0435\u0444\u043E\u043D:</strong> ${leadData.phone}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${leadData.email}</p>
              ${leadData.message ? `<p style="margin: 5px 0;"><strong>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435:</strong> ${leadData.message}</p>` : ""}
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">\u{1F4DE} \u041D\u0430\u0448\u0438 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B:</h3>
              <p style="margin: 5px 0;"><strong>\u0421\u0430\u0439\u0442:</strong> <a href="https://aideploy.ru" style="color: #0066cc;">aideploy.ru</a></p>
              <p style="margin: 5px 0;"><strong>\u0422\u0435\u043B\u0435\u0444\u043E\u043D:</strong> +7 930 720 24 69</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> info@aideploy.ru</p>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              \u0421 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435\u043C,<br>
              \u041A\u043E\u043C\u0430\u043D\u0434\u0430 AIDeploy
            </p>
          </div>
        </div>
      `;
      const clientMailOptions = {
        from: "info@aideploy.ru",
        to: leadData.email,
        subject: "\u2705 \u0412\u0430\u0448\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u0430 - AIDeploy",
        html: clientEmailContent
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 email \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443:", error);
        } else {
          console.log("Email \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D:", info.response);
        }
      });
      transporter.sendMail(clientMailOptions, (error, info) => {
        if (error) {
          console.log("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 email \u043A\u043B\u0438\u0435\u043D\u0442\u0443:", error);
        } else {
          console.log("Email \u043A\u043B\u0438\u0435\u043D\u0442\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D:", info.response);
        }
      });
      res.json({ success: true, lead });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          success: false,
          message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445",
          errors: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"
        });
      }
    }
  });
  app2.get("/api/leads", async (req, res) => {
    try {
      const leads2 = await storage.getLeads();
      res.json({ success: true, leads: leads2 });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0437\u0430\u044F\u0432\u043E\u043A"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error ${status}: ${message}`, "error");
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} is busy, trying to restart...`);
      setTimeout(() => {
        server.close();
        server.listen({
          port,
          host: "0.0.0.0",
          reusePort: true
        }, () => {
          log(`serving on port ${port}`);
        });
      }, 1e3);
    } else {
      throw err;
    }
  });
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
