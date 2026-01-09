import express from "express";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per file
  },
});

function isPng(file) {
  // Prefer mimetype check; also allow filename .png
  return (
    file?.mimetype === "image/png" ||
    (typeof file?.originalname === "string" &&
      file.originalname.toLowerCase().endsWith(".png"))
  );
}

export function makeProfileRouter({ db }) {
  const r = express.Router();

  // GET profile + completeness
  r.get("/", async (req, res) => {
    const userId = req.user.id;

    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) return res.status(400).json({ error: error.message });

    const is_complete =
      !!data.name &&
      !!data.firm_name &&
      !!data.qualification &&
      !!data.address &&
      !!data.phone &&
      !!data.letterhead_path &&
      !!data.signseal_path;

    res.json({ profile: data, is_complete });
  });

  // PUT update profile fields
  r.put("/", async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};

    const patch = {
      name: body.name ?? null,
      firm_name: body.firm_name ?? null,
      qualification: body.qualification ?? null,
      address: body.address ?? null,
      phone: body.phone ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) return res.status(400).json({ error: error.message });

    res.json({ profile: data });
  });

  // ✅ POST upload letterhead + signseal
  // FormData fields:
  // - letterhead (png)
  // - signseal (png)
  r.post(
    "/upload",
    upload.fields([
      { name: "letterhead", maxCount: 1 },
      { name: "signseal", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const userId = req.user.id;

        const assetsBucket = process.env.ASSETS_BUCKET || "engineer-assets";

        const letterheadFile = req.files?.letterhead?.[0] || null;
        const signsealFile = req.files?.signseal?.[0] || null;

        if (!letterheadFile && !signsealFile) {
          return res.status(400).json({
            error: "No files received. Upload letterhead and/or signseal.",
          });
        }

        const updatePatch = {
          updated_at: new Date().toISOString(),
        };

        // Upload letterhead
        if (letterheadFile) {
          if (!isPng(letterheadFile)) {
            return res
              .status(400)
              .json({ error: "Letterhead must be a PNG file." });
          }

          const path = `engineers/${userId}/letterhead.png`;

          const { error: upErr } = await db.storage
            .from(assetsBucket)
            .upload(path, letterheadFile.buffer, {
              contentType: "image/png",
              upsert: true,
            });

          if (upErr) return res.status(400).json({ error: upErr.message });

          updatePatch.letterhead_path = path;
        }

        // Upload sign+seal
        if (signsealFile) {
          if (!isPng(signsealFile)) {
            return res
              .status(400)
              .json({ error: "Sign + Seal must be a PNG file." });
          }

          const path = `engineers/${userId}/signseal.png`;

          const { error: upErr } = await db.storage
            .from(assetsBucket)
            .upload(path, signsealFile.buffer, {
              contentType: "image/png",
              upsert: true,
            });

          if (upErr) return res.status(400).json({ error: upErr.message });

          updatePatch.signseal_path = path;
        }

        // Update profile with storage paths
        const { data, error } = await db
          .from("profiles")
          .update(updatePatch)
          .eq("id", userId)
          .select("*")
          .single();

        if (error) return res.status(400).json({ error: error.message });

        const is_complete =
          !!data.name &&
          !!data.firm_name &&
          !!data.qualification &&
          !!data.address &&
          !!data.phone &&
          !!data.letterhead_path &&
          !!data.signseal_path;

        res.json({ ok: true, profile: data, is_complete });
      } catch (e) {
        res.status(400).json({ error: e.message || "Upload failed" });
      }
    }
  );

  return r;
}
