// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import multer from "multer";
// import { execFile } from "node:child_process";
// import { promisify } from "node:util";
// import fs from "node:fs/promises";
// import path from "node:path";
// import { fileURLToPath } from "node:url";

// dotenv.config();

// const run = promisify(execFile);
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const PUBLIC_DIR = path.join(__dirname, "..", "client", "public");
// const SUB_FOLDER = "ortaokul"; // hedef alt klasör
// const TARGET_DIR = path.join(PUBLIC_DIR, SUB_FOLDER);

// const app = express();
// const PORT = process.env.PORT || 3001;
// const upload = multer({ storage: multer.memoryStorage() });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(PUBLIC_DIR));
// // Basit bir route
// app.get("/", (req, res) => {
//   res.json({ message: "API çalışıyor! 🚀" });
// });

// // Resmi SVG'ye çevir
// app.post("/api/convert", upload.single("image"), async (req, res) => {
//   if (!req.file) return res.status(400).json({ error: "Dosya yok" });

//   const parsed = path.parse(req.file.originalname);
//   const baseName = parsed.name.replace(/[^\p{L}\p{N}_-]/gu, "_") || "image";
//   const ext = (parsed.ext || ".png").toLowerCase();

//   const inputPath = path.join(TARGET_DIR, `${baseName}${ext}`);
//   const outputPath = path.join(TARGET_DIR, `${baseName}.svg`);

//   try {
//     await fs.mkdir(TARGET_DIR, { recursive: true });
//     await fs.writeFile(inputPath, req.file.buffer);

//     await run("vtracer", [
//       "--input",
//       inputPath,
//       "--output",
//       outputPath,
//       "--mode",
//       "polygon",
//       "--colormode",
//       "color",
//       "--color_precision",
//       "4",
//     ]);

//     res.json({
//       svgUrl: `/${SUB_FOLDER}/${baseName}.svg`,
//       name: `${baseName}.svg`,
//     });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ error: "Dönüştürme başarısız. vtracer PATH'te mi?" });
//   } finally {
//     await fs.rm(inputPath, { force: true });
//   }
// });

// // Sunucuyu başlat
// app.listen(PORT, () => {
//   console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vtracer from "@visioncortex/vtracer"; // Resmi npm paketi

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "client", "public");
const SUB_FOLDER = "ortaokul"; // hedef alt klasör
const TARGET_DIR = path.join(PUBLIC_DIR, SUB_FOLDER);

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
// İzin verilen adresler listesi
const allowedOrigins = [
  "http://localhost:5173", // Vite yerel geliştirme portu (varsayılan)
  "http://localhost:3001",
  "https://svg-server-3tw8.onrender.com", // Render canlı URL'niz (veya frontend'inizin canlı URL'si)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Postman veya mobil uygulamalar gibi origin göndermeyen isteklere izin ver
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(
          new Error(
            "CORS politikalari nedeniyle bu kaynaktan gelen istek reddedildi.",
          ),
          false,
        );
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor! 🚀" });
});

// Resmi SVG'ye çevir (WASM tabanlı VTracer ile)
app.post("/api/convert", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dosya yok" });

  const parsed = path.parse(req.file.originalname);
  const baseName = parsed.name.replace(/[^\p{L}\p{N}_-]/gu, "_") || "image";
  const ext = (parsed.ext || ".png").toLowerCase();

  const inputPath = path.join(TARGET_DIR, `${baseName}${ext}`);
  const outputPath = path.join(TARGET_DIR, `${baseName}.svg`);

  try {
    await fs.mkdir(TARGET_DIR, { recursive: true });
    await fs.writeFile(inputPath, req.file.buffer);

    // Komut satırı yerine WASM tabanlı dahili fonksiyonu çağırıyoruz
    await vtracer.convertFile(inputPath, outputPath, {
      mode: "polygon",
      colormode: "color",
      color_precision: 4,
    });

    res.json({
      svgUrl: `/${SUB_FOLDER}/${baseName}.svg`,
      name: `${baseName}.svg`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Dönüştürme başarısız." });
  } finally {
    await fs.rm(inputPath, { force: true });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
