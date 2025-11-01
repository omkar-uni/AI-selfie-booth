// generateFinalImage.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import { fileURLToPath } from "url";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY; // 🔑 from .env

/**
 * Generate a themed EVOLVE image
 * @param {string} inputPath - Path of the input image
 * @param {string} theme - Theme name (e.g. 'professional', 'artistic', 'dark', etc.)
 */
export async function generateFinalImage(inputPath, theme = "professional") {
  try {
    console.log(`🎨 Generating EVOLVE themed image (${theme})...`);

    // === STEP 1: Remove background ===
    console.log("🪄 Removing background...");
    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(inputPath));
    formData.append("size", "auto");

    const removeBgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": REMOVE_BG_API_KEY },
      body: formData,
    });

    if (!removeBgRes.ok) {
      console.error("❌ Background removal failed:", await removeBgRes.text());
      throw new Error("Background removal API failed");
    }

    const removedBgBuffer = Buffer.from(await removeBgRes.arrayBuffer());
    const noBgPath = path.join(__dirname, "temp_removed.png");
    fs.writeFileSync(noBgPath, removedBgBuffer);
    console.log("✅ Background removed successfully.");

    // === STEP 2: Define assets ===
    const assetsDir = path.join(__dirname, "assets");

    // 🎨 Theme-based background selection
    const bgMap = {
      professional: "bg_professional.jpg",
      artistic: "bg_artistic.jpeg",
      superhero: "bg_superhero.jpg",
      doctor: "bg_doctor.jpeg",

      default: "bg.png", // fallback
    };

    const bgFileName = bgMap[theme] || bgMap.default;
    const bgImagePath = path.join(assetsDir, bgFileName);

    // 🌈 Common assets
    const blueArcPath = path.join(assetsDir, "blue.png");
    const logoPath = path.join(assetsDir, "evolveLogo.png");
    const babyTreePath = path.join(assetsDir, "babyTree.png");

    // === Frame settings ===
    const frameWidth = 1080;
    const frameHeight = 1350;

    // === STEP 3: Prepare background ===
    const background = await sharp(bgImagePath)
      .resize(frameWidth, frameHeight, { fit: "cover" })
      .toBuffer();

    // === STEP 4: Process subject ===
    const person = await sharp(noBgPath)
      .resize({ width: 900, height: 1200, fit: "inside" }) // slightly larger subject
      .toBuffer();

    const personMeta = await sharp(person).metadata();
    const personLeft = Math.floor((frameWidth - personMeta.width) / 2);
    const personTop = Math.floor(frameHeight - personMeta.height - 150);

    // === STEP 5: White gradient fade ===
    const gradientSvg = `
      <svg width="${frameWidth}" height="500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0" />
            <stop offset="100%" stop-color="white" stop-opacity="1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#fade)" />
      </svg>
    `;
    const gradientBuffer = await sharp(Buffer.from(gradientSvg))
      .png()
      .toBuffer();

    // === STEP 6: Load overlay assets ===
    const logo = await sharp(logoPath).resize(700).png().toBuffer();
    const babyTree = await sharp(babyTreePath).resize(450).png().toBuffer();
    const blueArc = await sharp(blueArcPath)
      .resize(frameWidth, 550, { fit: "cover" })
      .ensureAlpha(1)
      .png()
      .toBuffer();

    // === STEP 7: Composite all layers ===
    const final = await sharp(background)
      .composite([
        { input: person, top: personTop, left: personLeft },
        { input: gradientBuffer, top: frameHeight - 500, left: 0 },
        { input: babyTree, top: frameHeight - 520, left: -40 },
        { input: logo, top: frameHeight - 250, left: 200 },
        { input: blueArc, top: frameHeight - 150, left: 0, blend: "over" },
      ])
      .png()
      .toBuffer();

    // === STEP 8: Save output ===
    const outputDir = path.join(__dirname, "public");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(
      outputDir,
      `EVOLVE_${theme}_${Date.now()}.png`
    );
    fs.writeFileSync(outputPath, final);

    console.log(`✅ EVOLVE ${theme} poster created at: ${outputPath}`);

    // Cleanup temp file
    if (fs.existsSync(noBgPath)) fs.unlinkSync(noBgPath);

    return outputPath;
  } catch (err) {
    console.error("❌ Error generating EVOLVE image:", err);
    return inputPath;
  }
}
