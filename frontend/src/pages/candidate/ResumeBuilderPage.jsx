import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api";
import ResumeForm from "../../components/resume/ResumeForm";
import ResumeTabs from "../../components/resume/ResumeTabs";
import ResumeTemplateGrid from "../../components/resume/ResumeTemplateGrid";
import { resolveTemplateComponent } from "../../components/resume/templates";
import { ROUTES } from "../../routes";

const EMPTY_FORM = {
  id: null,
  title: "CV mới",
  template_slug: "",
  template_name: "",
  template_preview_url: "",
  full_name: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  address: "",
  headline: "",
  summary: "",
  current_title: "",
  years_experience: 0,
  expected_salary: "",
  desired_location: "",
  education: "",
  experience: "",
  skills: "",
  additional_info: "",
  is_primary: true,
};

function buildFormFromSources(user, profile, template = null, resume = null) {
  const structured = resume?.structured_json || {};
  const sourceTemplate = template || structured.template || {};
  return {
    ...EMPTY_FORM,
    id: resume?.id ?? null,
    title: resume?.title || (sourceTemplate.name ? `${sourceTemplate.name} - CV mới` : EMPTY_FORM.title),
    template_slug: sourceTemplate.slug || "",
    template_name: sourceTemplate.name || resume?.template_name || "",
    template_preview_url: sourceTemplate.preview_url || "",
    full_name: structured.full_name || user?.full_name || "",
    email: structured.email || user?.email || "",
    phone: structured.phone || user?.phone || "",
    dob: structured.dob || profile?.dob || "",
    gender: structured.gender || profile?.gender || "",
    address: structured.address || profile?.address || "",
    headline: structured.headline || profile?.headline || "",
    summary: structured.summary || profile?.summary || "",
    current_title: structured.current_title || profile?.current_title || "",
    years_experience: structured.years_experience ?? profile?.years_experience ?? 0,
    expected_salary: structured.expected_salary || profile?.expected_salary || "",
    desired_location: structured.desired_location || profile?.desired_location || "",
    education: structured.education || profile?.education || "",
    experience: structured.experience || profile?.experience || "",
    skills: Array.isArray(structured.skills) ? structured.skills.join(", ") : (structured.skills || ""),
    additional_info: structured.additional_info || "",
    is_primary: resume ? Boolean(resume.is_primary) : true,
  };
}

function buildFormFromResume(user, profile, resume, template = null) {
  const structured = resume?.structured_json || {};
  const sourceTemplate = template || structured.template || {};
  return {
    ...EMPTY_FORM,
    id: resume?.id ?? null,
    title: resume?.title || (sourceTemplate.name ? `${sourceTemplate.name} - CV mới` : EMPTY_FORM.title),
    template_slug: sourceTemplate.slug || resume?.template_name || "",
    template_name: sourceTemplate.name || resume?.template_name || "",
    template_preview_url: sourceTemplate.preview_url || resume?.template_preview_url || "",
    full_name: structured.full_name || user?.full_name || "",
    email: structured.email || user?.email || "",
    phone: structured.phone || user?.phone || "",
    dob: structured.dob || profile?.dob || "",
    gender: structured.gender || profile?.gender || "",
    address: structured.address || profile?.address || "",
    headline: structured.headline || profile?.headline || "",
    summary: structured.summary || profile?.summary || "",
    current_title: structured.current_title || profile?.current_title || "",
    years_experience: structured.years_experience ?? profile?.years_experience ?? 0,
    expected_salary: structured.expected_salary || profile?.expected_salary || "",
    desired_location: structured.desired_location || profile?.desired_location || "",
    education: structured.education || profile?.education || "",
    experience: structured.experience || profile?.experience || "",
    skills: Array.isArray(structured.skills) ? structured.skills.join(", ") : (structured.skills || ""),
    additional_info: structured.additional_info || "",
    is_primary: Boolean(resume?.is_primary),
  };
}

export default function ResumeBuilderPage({ defaultTab = "create" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [templates, setTemplates] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");

  const editingResumeId = location.state?.resumeId || null;
  const initialTemplateSlug = location.state?.templateSlug || "";

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [templatesData, userData, profileData, editingResume] = await Promise.all([
          api.resumes.templates().catch(() => []),
          api.auth.me().catch(() => null),
          api.resumes.getProfile().catch(() => null),
          editingResumeId ? api.resumes.detail(editingResumeId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        const normalizedTemplates = Array.isArray(templatesData) ? templatesData : [];
        const templateFromSlug = normalizedTemplates.find((item) => item.slug === initialTemplateSlug) || null;
        const templateFromResume = editingResume
          ? normalizedTemplates.find(
              (item) =>
                item.slug === editingResume.structured_json?.template?.slug ||
                item.name === editingResume.structured_json?.template?.name ||
                item.slug === editingResume.template_name ||
                item.name === editingResume.template_name,
            ) || null
          : null;

        setTemplates(normalizedTemplates);
        setUser(userData || null);
        setProfile(profileData || null);

        if (editingResume) {
          setSelectedTemplate(templateFromResume || templateFromSlug || null);
          setForm(buildFormFromResume(userData, profileData, editingResume, templateFromResume || templateFromSlug || null));
          setStep(2);
          setEditorModalOpen(true);
        } else if (templateFromSlug) {
          setSelectedTemplate(templateFromSlug);
          setForm(buildFormFromSources(userData, profileData, templateFromSlug, null));
          setStep(2);
          setEditorModalOpen(true);
        } else {
          setSelectedTemplate(null);
          setForm(buildFormFromSources(userData, profileData, null, null));
          setStep(1);
        }
      } catch (error) {
        if (mounted) {
          setMessage(error.message || "Không thể tải dữ liệu.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [editingResumeId, initialTemplateSlug]);

  const handleTab = (tab) => {
    setActiveTab(tab);
    navigate(tab === "list" ? ROUTES.candidate.resumes : ROUTES.candidate.resumeCreate);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setForm((current) => ({
      ...current,
      template_slug: template.slug,
      template_name: template.name,
      template_preview_url: template.preview_url,
      title: current.id ? current.title : `${template.name} - CV mới`,
    }));
    setStep(2);
    setEditorModalOpen(true);
    setMessage(`Đã chọn mẫu ${template.name}.`);
  };

  const handleChange = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "template_slug") {
        const template = templates.find((item) => item.slug === value || item.name === value);
        next.template_name = template?.name || value;
        next.template_preview_url = template?.preview_url || "";
        setSelectedTemplate(template || null);
        setStep(template ? 2 : 1);
      }
      if (field === "template_name") {
        const template = templates.find((item) => item.name === value || item.slug === value);
        next.template_slug = template?.slug || value;
        next.template_preview_url = template?.preview_url || "";
        setSelectedTemplate(template || null);
        setStep(template ? 2 : 1);
      }
      return next;
    });
  };

  const handleSaveDraft = () => {
    localStorage.setItem("candidate_resume_draft", JSON.stringify(form));
    const timestamp = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setDraftSavedAt(timestamp);
    setMessage(`Đã lưu nháp lúc ${timestamp}.`);
  };

  const handlePreview = () => {
    setEditorModalOpen(true);
    setStep(3);
    window.requestAnimationFrame(() => {
      const element = document.getElementById("cv-live-preview");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleSubmit = async () => {
    try {
      setBusy(true);
      const template = templates.find((item) => item.slug === form.template_slug || item.name === form.template_name);
      const payload = {
        title: form.title,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        dob: form.dob,
        gender: form.gender,
        address: form.address,
        headline: form.headline,
        summary: form.summary,
        current_title: form.current_title,
        years_experience: Number(form.years_experience || 0),
        expected_salary: form.expected_salary,
        desired_location: form.desired_location,
        education: form.education,
        experience: form.experience,
        skills: form.skills,
        additional_info: form.additional_info,
        template_id: template?.id || null,
        template_name: template?.name || form.template_name,
        template_slug: template?.slug || form.template_slug,
        template_preview_url: template?.preview_url || form.template_preview_url,
        is_primary: form.is_primary,
        raw_text: JSON.stringify(form),
        structured_json: {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          gender: form.gender,
          address: form.address,
          headline: form.headline,
          summary: form.summary,
          current_title: form.current_title,
          years_experience: Number(form.years_experience || 0),
          expected_salary: form.expected_salary,
          desired_location: form.desired_location,
          education: form.education,
          experience: form.experience,
          skills: form.skills,
          additional_info: form.additional_info,
          template: {
            id: template?.id || null,
            name: template?.name || form.template_name,
            slug: template?.slug || form.template_slug,
            preview_url: template?.preview_url || form.template_preview_url,
          },
        },
      };

      if (form.id) {
        await api.resumes.update(form.id, payload);
        setMessage("Đã cập nhật CV.");
      } else if (template?.id || template?.slug) {
        await api.resumes.createFromTemplate(payload);
        setMessage("Đã tạo CV từ template.");
      } else {
        await api.resumes.createManual(payload);
        setMessage("Đã tạo CV mới.");
      }
      setSelectedTemplate(template || selectedTemplate);
      navigate(ROUTES.candidate.resumes);
    } catch (error) {
      setMessage(error.message || "Không thể lưu CV.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = Boolean(selectedTemplate || form.template_slug || form.id);
  const previewTemplate = selectedTemplate || templates.find((item) => item.slug === form.template_slug || item.name === form.template_name) || null;
  const LiveTemplate = resolveTemplateComponent(previewTemplate?.slug || previewTemplate?.name || form.template_slug || form.template_name);

  return (
    <div className="landing-page candidate-cv-page candidate-cv-page--create">
      <section className="landing-section candidate-cv-hero candidate-cv-hero--create">
        <div className="candidate-cv-hero-copy">
          <span className="eyebrow">Tạo CV</span>
          <h1 className="rw-heading-xl">Chọn template → điền form → tạo CV</h1>
          <p className="lead">
            Flow tách riêng dành cho ứng viên: chọn một mẫu thật từ database, hoàn thiện dữ liệu cơ bản và tạo CV ngay trong cùng một màn.
          </p>
        </div>

        <div className="candidate-cv-hero-actions">
          <button type="button" className="rw-btn-outline-lg" onClick={() => navigate(ROUTES.candidate.resumes)}>
            CV của tôi
          </button>
          <button type="button" className="btn" onClick={() => navigate(ROUTES.candidate.resumes)}>
            Hoàn tất sau
          </button>
        </div>
      </section>

      <ResumeTabs activeTab={activeTab} onChange={handleTab} />

      <div className="candidate-create-steps">
        {[
          { id: 1, label: "Chọn template" },
          { id: 2, label: "Điền form" },
          { id: 3, label: "Tạo CV" },
        ].map((item) => (
          <div key={item.id} className={step >= item.id ? "candidate-create-step candidate-create-step--active" : "candidate-create-step"}>
            <strong>{item.id}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {message ? <div className="rw-alert-info">{message}</div> : null}

      <section className="candidate-create-layout">
        <div className="candidate-create-main">
          <section className="rw-card">
            <div className="rw-flex-between candidate-create-section-head">
              <div>
                <h2 className="rw-heading-2xl">Bước 1. Chọn template</h2>
                <p className="rw-muted-sm">Các mẫu bên dưới lấy trực tiếp từ bảng <code>cv_templates</code>.</p>
              </div>
              <span className="rw-badge rw-badge-slate">{templates.length} mẫu</span>
            </div>

            {loading ? (
              <div className="rw-state-default">
                <h3>Đang tải template...</h3>
                <p>Hệ thống đang lấy các mẫu thật từ database để dựng gallery chọn template.</p>
              </div>
            ) : (
              <ResumeTemplateGrid
                templates={templates}
                selectedSlug={selectedTemplate?.slug || form.template_slug}
                onUseTemplate={handleSelectTemplate}
              />
            )}
          </section>

          {selectedTemplate || form.id ? (
            <section className="rw-card candidate-create-selected">
              <div>
                <span className="eyebrow">Mẫu đã chọn</span>
                <h2 className="rw-heading-2xl">{selectedTemplate?.name || form.template_name || "Mẫu CV"}</h2>
                <p className="rw-muted-sm">{selectedTemplate?.summary || selectedTemplate?.description || "Template này sẽ được dùng để tạo CV realtime."}</p>
              </div>
              <div className="candidate-create-selected-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setStep(2);
                    setEditorModalOpen(true);
                  }}
                >
                  Mở trình chỉnh sửa CV
                </button>
                <button
                  type="button"
                  className="rw-btn-outline-lg"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setForm(buildFormFromSources(user, profile, null, null));
                    setStep(1);
                  }}
                >
                  Đổi mẫu
                </button>
              </div>
            </section>
          ) : (
            <section className="rw-card rw-state-empty">
              <h3>Chọn một template để mở form</h3>
              <p>Form sẽ được khóa theo template bạn chọn để giữ flow thật gọn và dễ theo dõi.</p>
            </section>
          )}
        </div>
      </section>

      {draftSavedAt && activeTab === "create" ? <div className="rw-draft-hint">Nháp gần nhất: {draftSavedAt}</div> : null}

      {editorModalOpen && (selectedTemplate || form.id || form.template_slug || form.template_name) ? (
        <div className="rw-modal-backdrop">
          <div className="rw-modal candidate-editor-modal">
            <div className="rw-modal-head">
              <div>
                <p className="rw-modal-kicker">Bước 2 + Bước 3</p>
                <h3 className="rw-heading-2xl">Chỉnh sửa và xem trước trong cùng một modal</h3>
                <p className="rw-modal-subtitle">Mẫu: {selectedTemplate?.name || form.template_name || "Chưa chọn"}</p>
              </div>
              <button type="button" className="rw-btn-close" onClick={() => setEditorModalOpen(false)}>
                Đóng
              </button>
            </div>

            <div className="rw-modal-body candidate-editor-modal-body">
              <section className="candidate-editor-form-pane">
                <ResumeForm
                  values={form}
                  templates={templates}
                  onChange={handleChange}
                  onSaveDraft={handleSaveDraft}
                  onPreview={handlePreview}
                  onSubmit={handleSubmit}
                  saving={busy}
                  editingTitle={form.id ? "Chỉnh sửa CV" : undefined}
                  lockTemplate
                  submitLabel={form.id ? "Cập nhật CV" : "Tạo CV"}
                />
              </section>

              <section className="candidate-editor-preview-pane" id="cv-live-preview">
                <div className="rw-flex-between candidate-create-section-head">
                  <div>
                    <h2 className="rw-heading-2xl">Xem trước CV thật</h2>
                    <p className="rw-muted-sm">Nội dung thay đổi realtime theo form bên trái.</p>
                  </div>
                  <span className="rw-badge rw-badge-green">Live CV</span>
                </div>

                <div className="candidate-create-preview-frame">
                  {previewTemplate ? (
                    <div className="candidate-live-template-wrap">
                      <LiveTemplate data={form} />
                    </div>
                  ) : (
                    <div className="rw-empty-dashed">Chưa chọn template nên chưa có preview CV.</div>
                  )}
                </div>

                <button type="button" className="btn" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSubmit} disabled={busy || !canSubmit}>
                  {busy ? "Đang tạo..." : form.id ? "Cập nhật CV ngay" : "Tạo CV ngay"}
                </button>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
