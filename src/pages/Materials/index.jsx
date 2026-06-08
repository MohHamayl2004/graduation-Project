import { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  ExternalLink,
  X
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import { deleteMaterial, getMaterials, uploadMaterial } from "../../services/materialService";

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Arabic", "Other"];
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function resolveFileUrl(fileUrl) {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${BACKEND_ORIGIN}${fileUrl}`;
}

function nameWithoutExtension(fileName) {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

export default function Materials() {
  const { auth } = useAuth();
  const token = auth?.token;
  const fileInputRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [listError, setListError] = useState("");

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadMaterials = async () => {
    if (!token) return;
    setLoadingMaterials(true);
    setListError("");
    try {
      const data = await getMaterials(token);
      setMaterials(data?.materials || []);
    } catch (err) {
      setListError(err.message || "Could not load your materials.");
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFileSelected = (selected) => {
    if (!selected) return;
    setFile(selected);
    setUploadError("");
    setUploadSuccess("");
    if (!title.trim()) {
      setTitle(nameWithoutExtension(selected.name));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    handleFileSelected(dropped);
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim() || nameWithoutExtension(file.name));
      formData.append("subject", subject);
      if (description.trim()) formData.append("description", description.trim());

      await uploadMaterial(formData, token);

      setUploadSuccess("Your material was uploaded successfully.");
      setTitle("");
      setDescription("");
      setSubject(SUBJECTS[0]);
      clearSelectedFile();
      loadMaterials();
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteMaterial(id, token);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setListError(err.message || "Could not delete this material.");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedMaterials = useMemo(
    () => [...materials].sort((a, b) => new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)),
    [materials]
  );

  return (
    <div className="min-h-screen bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar activeItem="My Materials" />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="Search your materials..." showAvatar />

          <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1100px]">
              <h1 className="text-[36px] font-semibold leading-tight text-[#1b2338]">My Materials</h1>
              <p className="mt-1 text-[16px] text-[#5d6273]">
                Upload your textbooks, notes, and slides — your AI tutor will turn them into lectures and quizzes.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-[#cfd4e2] bg-white p-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                    isDragging ? "border-[#1b59cb] bg-[#eef3ff]" : "border-[#c9cfde] bg-[#fbfbfe] hover:bg-[#f3f5fb]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.doc,.pptx"
                    onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  />
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#e6ecff] text-[#1d5dd4]">
                    <UploadCloud size={28} />
                  </div>
                  <p className="text-[20px] font-semibold text-[#262d41]">Drag & drop your file here</p>
                  <p className="text-[15px] text-[#6f7588]">or click to browse from your device</p>
                  <p className="text-[13px] text-[#9aa0b3]">PDF, Word, PowerPoint, images, and text files supported</p>
                </div>

                {file ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#cfd4e2] bg-[#f7f8fc] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={20} className="shrink-0 text-[#1d5dd4]" />
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-medium text-[#262d41]">{file.name}</p>
                        <p className="text-[13px] text-[#6f7588]">{formatFileSize(file.size)} · {file.type || "Unknown type"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={clearSelectedFile} className="rounded-full p-2 text-[#6f7588] hover:bg-[#eaedf6]" aria-label="Remove selected file">
                      <X size={18} />
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[15px] font-medium text-[#262d41]">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Chapter 3 - Chemical Bonds"
                      className="h-12 w-full rounded-xl border border-[#c8ccda] bg-white px-4 text-[16px] outline-none transition focus:border-[#1e56ce] focus:ring-2 focus:ring-[#1e56ce]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[15px] font-medium text-[#262d41]">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#c8ccda] bg-white px-4 text-[16px] outline-none transition focus:border-[#1e56ce] focus:ring-2 focus:ring-[#1e56ce]/20"
                    >
                      {SUBJECTS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-[15px] font-medium text-[#262d41]">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a short note about this material..."
                    rows={2}
                    className="w-full rounded-xl border border-[#c8ccda] bg-white px-4 py-3 text-[16px] outline-none transition focus:border-[#1e56ce] focus:ring-2 focus:ring-[#1e56ce]/20"
                  />
                </div>

                {uploadError ? (
                  <p className="mt-4 flex items-center gap-2 text-[15px] text-red-600"><AlertCircle size={16} /> {uploadError}</p>
                ) : null}
                {uploadSuccess ? (
                  <p className="mt-4 flex items-center gap-2 text-[15px] text-[#0d8a64]"><CheckCircle2 size={16} /> {uploadSuccess}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1453c6] text-[17px] font-semibold text-white transition hover:bg-[#0f46ac] disabled:opacity-70 sm:w-auto sm:px-8"
                >
                  {uploading ? <><Loader size={18} className="animate-spin" /> Uploading...</> : "Upload Material"}
                </button>
              </form>

              <div className="mt-8">
                <h2 className="text-[24px] font-semibold text-[#1b2338]">Uploaded Materials</h2>

                {listError ? (
                  <p className="mt-3 flex items-center gap-2 text-[15px] text-red-600"><AlertCircle size={16} /> {listError}</p>
                ) : null}

                {loadingMaterials ? (
                  <div className="mt-4 flex items-center gap-2 text-[16px] text-[#5d6273]">
                    <Loader size={18} className="animate-spin" /> Loading your materials...
                  </div>
                ) : sortedMaterials.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#cfd4e2] bg-white px-6 py-10 text-center text-[16px] text-[#6f7588]">
                    You haven&apos;t uploaded any materials yet. Use the form above to add your first one.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedMaterials.map((material) => (
                      <div key={material._id} className="flex flex-col rounded-2xl border border-[#cfd4e2] bg-white p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6ecff] text-[#1d5dd4]">
                            <FileText size={20} />
                          </div>
                          <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-[12px] font-medium capitalize text-[#1d5dd4]">
                            {material.status || "uploaded"}
                          </span>
                        </div>

                        <h3 className="mt-3 truncate text-[18px] font-semibold text-[#1b2338]" title={material.title}>
                          {material.title}
                        </h3>
                        <p className="mt-1 text-[14px] text-[#6f7588]">{material.subject || "General"}</p>
                        <p className="mt-2 truncate text-[13px] text-[#8a90a2]" title={material.originalName}>
                          {material.originalName || "Original file"}
                        </p>
                        <p className="mt-1 text-[13px] text-[#8a90a2]">
                          Uploaded {formatDate(material.uploadedAt || material.createdAt)} · {material.type || "file"}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <a
                            href={resolveFileUrl(material.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#c3c9d8] px-3 text-[14px] text-[#2f374a] transition hover:bg-[#f3f5fb]"
                          >
                            <ExternalLink size={15} /> View
                          </a>
                          <a
                            href={resolveFileUrl(material.fileUrl)}
                            download={material.originalName || true}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#c3c9d8] px-3 text-[14px] text-[#2f374a] transition hover:bg-[#f3f5fb]"
                          >
                            <Download size={15} /> Download
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete(material._id)}
                            disabled={deletingId === material._id}
                            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ecb9b6] px-3 text-[14px] text-[#b3261e] transition hover:bg-[#fbeceb] disabled:opacity-60"
                          >
                            {deletingId === material._id ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
