import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import ResumeCard from "../../components/resume/ResumeCard";
import ResumePreviewModal from "../../components/resume/ResumePreviewModal";
import ResumeStats from "../../components/resume/ResumeStats";
import ResumeTabs from "../../components/resume/ResumeTabs";
import ResumeUploadCard from "../../components/resume/ResumeUploadCard";
import { resolveTemplateComponent } from "../../components/resume/templates";
import { ROUTES } from "../../routes";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "manual", label: "CV tạo" },
  { id: "upload", label: "CV upload" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "primary", label: "CV chính trước" },
];

function matchesQuery(resume, query) {
  if (!query) return true;
  const structured = resume.structured_json || {};
  const haystack = [
    resume.title,
    resume.template_name,
    resume.original_filename,
    structured.full_name,
    structured.headline,
    structured.summary,
    structured.skills,
    (resume.tags || []).map((tag) => tag.name).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function buildAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filenameFromContentDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return fallback;
    }
  }
  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function toTemplateKey(resume) {
  const structured = resume?.structured_json || {};
  const template = structured.template || {};
  return template.slug || template.name || resume?.template_name || "modern-blue";
}

function toSafeFilename(value, fallback = "resume") {
  const source = String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return source || fallback;
}

export default function ResumeWorkspacePage({ defaultTab = "list" }) {
  const navigate = useNavigate();
  const uploadButtonRef = useRef(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [query, setQuery] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [previewResume, setPreviewResume] = useState(null);
  const [exportResume, setExportResume] = useState(null);
  const exportTemplateRef = useRef(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const data = await api.resumes.list().catch(() => []);
      setResumes(Array.isArray(data) ? data : []);
    } catch (error) {
      setResumes([]);
      setMessage(error.message || "Không thể tải danh sách CV.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const setTab = (tab) => {
    setActiveTab(tab);
    navigate(tab === "create" ? ROUTES.candidate.resumeCreate : ROUTES.candidate.resumes);
  };

  const filteredResumes = useMemo(() => {
    let items = [...resumes];

    if (filterMode === "manual") {
      items = items.filter((resume) => resume.source_type === "manual");
    } else if (filterMode === "upload") {
      items = items.filter((resume) => resume.source_type === "upload");
    }

    items = items.filter((resume) => matchesQuery(resume, query));

    items.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      if (sortMode === "oldest") return dateA - dateB;
      if (sortMode === "primary") {
        if (Boolean(a.is_primary) !== Boolean(b.is_primary)) {
          return Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
        }
        return dateB - dateA;
      }
      return dateB - dateA;
    });

    return items;
  }, [resumes, filterMode, query, sortMode]);

  const openExport = async (resumeId, format = "pdf") => {
    const response = await fetch(api.resumes.exportUrl(resumeId, format), {
      headers: buildAuthHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Không thể tải file (${response.status}).`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const fallbackName = `resume-${resumeId}.${format}`;
    const downloadName = filenameFromContentDisposition(response.headers.get("content-disposition"), fallbackName);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  };

  const openTemplateExport = async (resume) => {
    setExportResume(resume);

    // Wait two frames to ensure the hidden export template is fully rendered.
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });

    const templateNode = exportTemplateRef.current?.querySelector(".cv-template");
    if (!templateNode) {
      throw new Error("Không dựng được template để xuất PDF.");
    }

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;
    const filename = `${toSafeFilename(resume.title, `resume-${resume.id}`)}.pdf`;

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(templateNode)
      .save();
  };

  const handleDownload = async (resume) => {
    try {
      setBusy(true);
      if (resume.source_type === "manual") {
        await openTemplateExport(resume);
      } else {
        await openExport(resume.id, "pdf");
      }
      setMessage("Đã bắt đầu tải PDF.");
    } catch (error) {
      setMessage(error.message || "Không thể tải file PDF.");
    } finally {
      setBusy(false);
      setExportResume(null);
    }
  };

  const handleUpload = async (fileFromInput) => {
    const file = fileFromInput || uploadFile;
    if (!file) {
      setMessage("Chọn file trước khi upload.");
      return;
    }

    try {
      setBusy(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", `CV upload - ${file.name}`);
      formData.append("is_primary", resumes.length ? "false" : "true");
      await api.resumes.upload(formData);
      setUploadFile(null);
      setMessage("Đã upload CV vào database.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "Không thể upload CV.");
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = (resume) => {
    setPreviewResume(resume);
  };

  const handleEditResume = (resume) => {
    navigate(ROUTES.candidate.resumeCreate, { state: { resumeId: resume.id } });
  };

  const handleDeleteResume = async (resume) => {
    const confirmed = window.confirm(`Xóa CV "${resume.title}"?`);
    if (!confirmed) return;

    try {
      setBusy(true);
      await api.resumes.remove(resume.id);
      setMessage("Đã xóa CV.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "Không thể xóa CV.");
    } finally {
      setBusy(false);
    }
  };

  const handleSetPrimary = async (resume) => {
    try {
      setBusy(true);
      await api.resumes.update(resume.id, { is_primary: true });
      setMessage("Đã đặt làm CV chính.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "Không thể đổi CV chính.");
    } finally {
      setBusy(false);
    }
  };

  const exportTemplateKey = exportResume ? toTemplateKey(exportResume) : null;
  const ExportTemplateComponent = exportTemplateKey ? resolveTemplateComponent(exportTemplateKey) : null;

  return (
    <div className="landing-page candidate-cv-page">
      <section className="landing-section candidate-cv-hero">
        <div className="candidate-cv-hero-copy">
          <span className="eyebrow">CV của tôi</span>
          <h1 className="rw-heading-xl">Quản lý CV gọn gàng, rõ vai trò</h1>
          <p className="lead">
            Một nơi để theo dõi CV đã tạo, CV upload và CV đang dùng ứng tuyển. Thẻ CV hiển thị preview trực quan, thao tác nhanh và không lẫn với màn tạo CV.
          </p>
          <div className="candidate-cv-hero-tags">
            <span className="candidate-cv-hero-tag">Preview CV thật</span>
            <span className="candidate-cv-hero-tag">Đặt CV chính</span>
            <span className="candidate-cv-hero-tag">Tải file thật</span>
          </div>
        </div>

        <div className="candidate-cv-hero-actions">
          <button type="button" className="btn" onClick={() => setTab("create")}>Tạo CV</button>
          <button type="button" className="rw-btn-outline-lg" onClick={() => uploadButtonRef.current?.click()}>
            Upload CV
          </button>
          <input
            ref={uploadButtonRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) {
                setUploadFile(file);
                void handleUpload(file);
              }
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <ResumeTabs activeTab={activeTab} onChange={setTab} />
      <ResumeStats resumes={resumes} />

      {message ? <div className="rw-alert-info">{message}</div> : null}

      <section className="candidate-cv-body">
        <aside className="candidate-cv-aside">
          <ResumeUploadCard file={uploadFile} onPickFile={setUploadFile} onSubmitUpload={() => handleUpload()} busy={busy} />

          <section className="rw-card candidate-cv-side-note">
            <h3>Nguyên tắc quản lý</h3>
            <p>
              CV chính được làm nổi bật bằng viền xanh và badge. CV upload giữ nguyên file gốc, CV tạo từ mẫu có preview dữ liệu thật theo template đã chọn.
            </p>
          </section>
        </aside>

        <main className="candidate-cv-main">
          <section className="rw-card candidate-cv-toolbar">
            <div className="candidate-cv-filter-chips" role="tablist" aria-label="Lọc CV">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterMode(item.id)}
                  className={filterMode === item.id ? "candidate-cv-filter-chip candidate-cv-filter-chip--active" : "candidate-cv-filter-chip"}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="candidate-cv-toolbar-right">
              <label className="candidate-cv-search">
                <span>Tìm kiếm</span>
                <input
                  className="rw-input rw-input-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tên CV, template, tag, file upload..."
                />
              </label>

              <label className="candidate-cv-sort">
                <span>Sắp xếp</span>
                <select className="rw-input rw-input-sm" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                  {SORT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {loading ? (
            <div className="rw-state-default">
              <h3>Đang tải CV từ database...</h3>
              <p>Hệ thống đang lấy dữ liệu thật từ MySQL để dựng danh sách CV của bạn.</p>
            </div>
          ) : filteredResumes.length ? (
            <div className="candidate-cv-grid">
              {filteredResumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  active={Boolean(resume.is_primary)}
                  onPreview={handlePreview}
                  onEdit={handleEditResume}
                  onDownload={handleDownload}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDeleteResume}
                />
              ))}
            </div>
          ) : (
            <div className="rw-state-empty candidate-cv-empty">
              <h3>Chưa có CV phù hợp</h3>
              <p>
                Hãy upload một file PDF có sẵn hoặc tạo CV mới từ template để bắt đầu quản lý CV thật của bạn.
              </p>
            </div>
          )}
        </main>
      </section>

      {previewResume ? <ResumePreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} onDownload={handleDownload} /> : null}

      {ExportTemplateComponent && exportResume ? (
        <div className="rw-pdf-export-stage" aria-hidden="true" ref={exportTemplateRef}>
          <div className="rw-pdf-export-sheet">
            <ExportTemplateComponent data={exportResume.structured_json || {}} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
