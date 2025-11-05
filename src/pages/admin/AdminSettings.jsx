import React, { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase, uploadPublic } from "../../lib/supabaseClient.js";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2">
      <div className="text-sm text-white/70">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

// Canvas crop helper -> returns Blob of the cropped area
async function getCroppedBlob(imageSrc, cropAreaPixels, mime = "image/jpeg", quality = 0.9) {
  const image = await new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const { width, height, x, y } = cropAreaPixels;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

  return await new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      mime,
      quality
    );
  });
}

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- Crop modal state ---
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");                // object URL for selected file
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [pendingHeadshotName, setPendingHeadshotName] = useState("headshot.jpg");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setS(data || {});
    })();
  }, []);

  async function ensureRow() {
    if (s?.id) return s;
    const base = { ...(s || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("mf_site_settings").insert([base]).select().single();
    if (error) throw error;
    setS(data);
    return data;
  }

  async function savePartial(patch) {
    const current = await ensureRow();
    const payload = { ...current, ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("mf_site_settings").update(payload).eq("id", current.id);
    if (error) throw error;
    setS(payload);
  }

  async function uploadAndSave(e, field, folder) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPublic(file, folder);
      await savePartial({ [field]: url });
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check bucket/policies and that you are logged in.");
    } finally {
      e.target.value = "";
    }
  }

  // Headshot: open crop modal instead of direct upload
  async function startHeadshotCrop(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // keep a file-like name for the uploaded blob
    setPendingHeadshotName(file.name?.toLowerCase().endsWith(".png") ? file.name : "headshot.jpg");
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
    // clear input so same file can be re-picked later if needed
    e.target.value = "";
  }

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function confirmHeadshotCrop() {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      setUploadingHeadshot(true);
      const mime = pendingHeadshotName.endsWith(".png") ? "image/png" : "image/jpeg";
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels, mime, 0.9);
      const file = new File([blob], pendingHeadshotName, { type: mime });

      const url = await uploadPublic(file, "headshots");
      await savePartial({ headshot_url: url });
      setCropOpen(false);
      // cleanup object URL
      URL.revokeObjectURL(cropSrc);
      setCropSrc("");
    } catch (err) {
      console.error(err);
      alert("Headshot upload failed.");
    } finally {
      setUploadingHeadshot(false);
    }
  }

  async function saveAll() {
    if (!s) return;
    setSaving(true);
    try {
      await savePartial({});
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div>Loading…</div>;

  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold mb-3">Site Settings</h3>

        <Row label="Logo (upload)">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => uploadAndSave(e, "logo_url", "logos")} />
            {s.logo_url && <img src={s.logo_url} className="h-8 rounded" alt="logo preview" />}
          </div>
        </Row>

        <Row label="Headshot (crop & upload)">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={startHeadshotCrop} />
            {s.headshot_url && (
              <img
                src={s.headshot_url}
                className="h-12 w-12 rounded-xl object-cover border border-white/10"
                alt="headshot preview"
              />
            )}
          </div>
        </Row>

        <Row label="Notification recipients (emails)">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.notify_emails || ""}
            onChange={(e) => setS({ ...s, notify_emails: e.target.value })}
            onBlur={() => savePartial({ notify_emails: s.notify_emails || "" })}
            placeholder="you@agency.com, manager@agency.com"
          />
        </Row>

        <Row label="Site Name">
          <input
            className="w-full bg白/5 border border白/15 p-2 rounded"
            value={s.site_name || ""}
            onChange={(e) => setS({ ...s, site_name: e.target.value })}
            onBlur={() => savePartial({ site_name: s.site_name || null })}
          />
        </Row>

        <Row label="Hero Title">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.hero_title || ""}
            onChange={(e) => setS({ ...s, hero_title: e.target.value })}
            onBlur={() => savePartial({ hero_title: s.hero_title || null })}
          />
        </Row>

        <Row label="Hero Sub">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.hero_sub || ""}
            onChange={(e) => setS({ ...s, hero_sub: e.target.value })}
            onBlur={() => savePartial({ hero_sub: s.hero_sub || null })}
          />
        </Row>

        <Row label="About Name">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.about_name || ""}
            onChange={(e) => setS({ ...s, about_name: e.target.value })}
            onBlur={() => savePartial({ about_name: s.about_name || null })}
          />
        </Row>

        <Row label="About Bio">
          <textarea
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.about_bio || ""}
            onChange={(e) => setS({ ...s, about_bio: e.target.value })}
            onBlur={() => savePartial({ about_bio: s.about_bio || null })}
          />
        </Row>

        {/* YouTube controls */}
        <Row label="Hero YouTube URL">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.hero_youtube_url || ""}
            onChange={(e) => setS({ ...s, hero_youtube_url: e.target.value })}
            onBlur={() => savePartial({ hero_youtube_url: s.hero_youtube_url || null })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Row>

        <Row label="YouTube URL (fallback)">
          <input
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={s.youtube_url || ""}
            onChange={(e) => setS({ ...s, youtube_url: e.target.value })}
            onBlur={() => savePartial({ youtube_url: s.youtube_url || null })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Row>

        {/* --------- Socials (URLs only) --------- */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="text-md font-semibold mb-2">Socials</h4>

          <Row label="YouTube URL">
            <input
              className="w-full bg-white/5 border border-white/15 p-2 rounded"
              value={s.social_youtube_url || ""}
              onChange={(e) => setS({ ...s, social_youtube_url: e.target.value })}
              onBlur={() => savePartial({ social_youtube_url: s.social_youtube_url || null })}
              placeholder="https://youtube.com/@yourchannel"
            />
          </Row>

          <Row label="Instagram URL">
            <input
              className="w-full bg-white/5 border border-white/15 p-2 rounded"
              value={s.social_instagram_url || ""}
              onChange={(e) => setS({ ...s, social_instagram_url: e.target.value })}
              onBlur={() => savePartial({ social_instagram_url: s.social_instagram_url || null })}
              placeholder="https://instagram.com/yourhandle"
            />
          </Row>

          <Row label="Snapchat URL">
            <input
              className="w-full bg-white/5 border border-white/15 p-2 rounded"
              value={s.social_snapchat_url || ""}
              onChange={(e) => setS({ ...s, social_snapchat_url: e.target.value })}
              onBlur={() => savePartial({ social_snapchat_url: s.social_snapchat_url || null })}
              placeholder="https://www.snapchat.com/add/yourhandle"
            />
          </Row>

          <div className="text-xs text-white/50 mt-2">
            Paste full links only. These power the icon buttons on the landing page.
          </div>
        </div>

        <button onClick={saveAll} disabled={saving} className="mt-4 px-4 py-2 rounded-lg bg-white text-black">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* === Crop Modal === */}
      {cropOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#2b2d31] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h4 className="font-semibold">Crop headshot</h4>
              <button className="text-white/60 hover:text-white" onClick={() => setCropOpen(false)}>✕</button>
            </div>

            <div className="relative h-[360px] bg-black">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>

            <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-sm text-white/70">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full sm:w-56"
                />
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <button
                  className="px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
                  onClick={() => { setCropOpen(false); URL.revokeObjectURL(cropSrc); setCropSrc(""); }}
                  disabled={uploadingHeadshot}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-white text-black font-semibold"
                  onClick={confirmHeadshotCrop}
                  disabled={uploadingHeadshot}
                >
                  {uploadingHeadshot ? "Uploading…" : "Save crop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
