import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ROUTES } from '../../routes';
import ResumeForm from '../../components/resume/ResumeForm';
import ResumeTabs from '../../components/resume/ResumeTabs';
import ResumeTemplateGrid from '../../components/resume/ResumeTemplateGrid';
import { resolveTemplateComponent } from '../../components/resume/templates';

const EMPTY_FORM = {
  id: null,
  title: 'CV từ file',
  template_slug: '',
  template_name: '',
  template_preview_url: '',
  full_name: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  headline: '',
  summary: '',
  current_title: '',
  years_experience: 0,
  expected_salary: '',
  desired_location: '',
  education: '',
  experience: '',
  skills: '',
  tag_ids: [],
  additional_info: '',
  is_primary: false,
};

const RAW_TEXT_FIELDS = ['headline', 'summary', 'skills', 'experience', 'education', 'additional_info', 'current_title'];

function buildRawText(source) {
  return RAW_TEXT_FIELDS.map((f) => String(source?.[f] || '').trim()).filter(Boolean).join('\n\n');
}

function repairFragmentedLines(value) {
  if (value == null) return value;
  const text = String(value).replace(/\r\n/g, '\n');
  const allLines = text.split('\n');
  const allMeaningfulLines = allLines.filter((line) => line.trim());
  if (allMeaningfulLines.length >= 10) {
    const allLengths = allMeaningfulLines.map((line) => line.replace(/\s+/g, '').length);
    const allShortCount = allLengths.filter((length) => length <= 2).length;
    const allAverageLength = allLengths.reduce((sum, length) => sum + length, 0) / allLengths.length;
    if (allShortCount / allMeaningfulLines.length >= 0.75 && allAverageLength <= 2) {
      return allLines.join('').trim();
    }
  }

  return text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => {
      const rawLines = paragraph.split('\n');
      const lines = rawLines.filter((line) => line.trim());
      if (lines.length < 4) return paragraph.trim();

      const lengths = lines.map((line) => line.replace(/\s+/g, '').length);
      const shortCount = lengths.filter((length) => length <= 2).length;
      const averageLength = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;

      if (shortCount / lines.length >= 0.75 && averageLength <= 2) {
        return rawLines.join('').trim();
      }
      return lines.map((line) => line.trim()).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function normalizeParsedResume(data) {
  const fields = ['full_name', 'headline', 'summary', 'current_title', 'education', 'experience', 'skills', 'additional_info', 'address'];
  return fields.reduce((next, field) => {
    next[field] = repairFragmentedLines(next[field]);
    return next;
  }, { ...data });
}

function getParseErrorMessage(error) {
  const message = String(error?.message || '');
  if (message.includes('Could not extract readable text')) {
    return 'Không thể đọc nội dung từ file CV này. File PDF có thể là ảnh/scan nên hệ thống chưa trích xuất được chữ. Vui lòng thử DOCX hoặc PDF có thể bôi đen/copy chữ.';
  }
  if (message.includes('Failed to fetch') || message.includes('ERR_CONNECTION_REFUSED')) {
    return 'Không kết nối được hệ thống. Vui lòng kiểm tra máy chủ API đang chạy ở port 5001.';
  }
  return message || 'Không thể phân tích CV. Vui lòng thử lại.';
}

export default function ParseCVPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const uploadedResume = location.state?.uploadedResume || null;
  const fileInputRef = useRef(null);

  const [activeTab] = useState('parse');
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [skillTags, setSkillTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [file, setFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [parseFailed, setParseFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tplData, skillData] = await Promise.all([
          api.resumes.templates().catch(() => []),
          api.tags.list('?category=skill').catch(() => []),
        ]);
        setTemplates(Array.isArray(tplData) ? tplData : []);
        setSkillTags(Array.isArray(skillData) ? skillData : []);

        // Nếu đi từ nút "Tạo CV theo mẫu" trên CV đã tải lên,
        // bỏ qua bước tải file và chuyển thẳng tới bước chọn mẫu.
        if (uploadedResume) {
          setStep(2);
          setMessage(`Đang dùng CV đã tải lên: ${uploadedResume.original_filename || uploadedResume.title}`);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleTab = (tab) => {
    if (tab === 'list') navigate(ROUTES.candidate.resumes);
    else if (tab === 'create') navigate(ROUTES.candidate.resumeCreate);
  };

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const ext = picked.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setMessage('Chỉ hỗ trợ file PDF, DOC, DOCX.');
      return;
    }
    setFile(picked);
    setSelectedTemplate(null);
    setForm(EMPTY_FORM);
    setParseFailed(false);
    setEditorModalOpen(false);
    setMessage(`Đã chọn file: ${picked.name}`);
    setStep(2);
  };

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setParseFailed(false);
    setMessage(`Đang phân tích CV với mẫu ${template.name}...`);
    setParsing(true);

    try {
      const formData = new FormData();
      if (uploadedResume) {
        formData.append('resume_id', uploadedResume.id);
      } else if (file) {
        formData.append('file', file);
      } else {
        setMessage('Vui lòng tải file CV lên trước.');
        setParsing(false);
        return;
      }

      const parsed = normalizeParsedResume(await api.resumes.parsePreview(formData));

      // Điền sẵn dữ liệu đã phân tích và thông tin mẫu CV vào biểu mẫu.
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        template_slug: template.slug || '',
        template_name: template.name || '',
        template_preview_url: template.preview_url || '',
        title: `${template.name} - CV từ file`,
        years_experience: Number(parsed.years_experience || 0),
        tag_ids: [],
      });

      setStep(3);
      setEditorModalOpen(true);
      setMessage(`Đã phân tích xong. Kiểm tra và chỉnh sửa thông tin trước khi tạo CV.`);
    } catch (err) {
      setForm({
        ...EMPTY_FORM,
        template_slug: template.slug || '',
        template_name: template.name || '',
        template_preview_url: template.preview_url || '',
        title: `${template.name} - CV từ file`,
        tag_ids: [],
      });
      setParseFailed(true);
      setEditorModalOpen(true);
      setStep(3);
      setMessage(getParseErrorMessage(err));
    } finally {
      setParsing(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((cur) => ({ ...cur, [field]: value }));
  };

  const toggleSkillTag = (tagId) => {
    setForm((cur) => {
      const ids = new Set(cur.tag_ids || []);
      if (ids.has(tagId)) ids.delete(tagId);
      else ids.add(tagId);
      return { ...cur, tag_ids: Array.from(ids) };
    });
  };

  const handleSaveDraft = () => {
    localStorage.setItem('parse_cv_draft', JSON.stringify(form));
    const ts = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setDraftSavedAt(ts);
    setMessage(`Đã lưu nháp lúc ${ts}.`);
  };

  const handlePreview = () => {
    setEditorModalOpen(true);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      setMessage('Vui lòng chọn mẫu CV.');
      return;
    }
    try {
      setBusy(true);
      const template = selectedTemplate;
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
        tag_ids: form.tag_ids,
        additional_info: form.additional_info,
        template_id: template?.id || null,
        template_name: template?.name || form.template_name,
        template_slug: template?.slug || form.template_slug,
        template_preview_url: template?.preview_url || form.template_preview_url,
        is_primary: form.is_primary,
        raw_text: buildRawText(form),
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
          skills_text: form.skills,
          additional_info: form.additional_info,
          template: {
            id: template?.id || null,
            name: template?.name || form.template_name,
            slug: template?.slug || form.template_slug,
            preview_url: template?.preview_url || form.template_preview_url,
          },
        },
      };

      await api.resumes.createFromTemplate(payload);
      setMessage('Đã tạo CV thành công!');
      navigate(ROUTES.candidate.resumes);
    } catch (err) {
      setMessage(err?.message || 'Không thể tạo CV.');
    } finally {
      setBusy(false);
    }
  };

  const previewTemplate = selectedTemplate || templates.find((t) => t.slug === form.template_slug) || null;
  const LiveTemplate = resolveTemplateComponent(previewTemplate?.slug || previewTemplate?.name || form.template_slug);

  return (
    <div className="landing-page candidate-cv-page candidate-cv-page--create">
      {/* Giới thiệu */}
      <section className="landing-section candidate-cv-hero candidate-cv-hero--create">
        <div className="candidate-cv-hero-copy">
          <span className="eyebrow">Phân tích CV</span>
          <h1 className="rw-heading-xl">Tải lên CV → chọn mẫu → chỉnh sửa thông tin → tạo CV</h1>
          <p className="lead">
            Hệ thống tự động trích xuất thông tin từ file CV (tên, email, kỹ năng, kinh nghiệm) rồi điền sẵn vào mẫu bạn chọn. Bạn có thể chỉnh sửa trước khi lưu.
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

      {/* Thanh điều hướng */}
      <ResumeTabs activeTab={activeTab} onChange={handleTab} />

      {/* Các bước thực hiện */}
      <div className="candidate-create-steps">
        {[
          { id: 1, label: 'Tải lên CV' },
          { id: 2, label: 'Chọn mẫu' },
          { id: 3, label: 'Chỉnh sửa & tạo CV' },
        ].map((item) => (
          <div
            key={item.id}
            className={step >= item.id ? 'candidate-create-step candidate-create-step--active' : 'candidate-create-step'}
          >
            <strong>{item.id}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {message && <div className="rw-alert-info">{message}</div>}

      <section className="candidate-create-layout">
        <div className="candidate-create-main">

          {/* Bước 1: Tải file lên, ẩn khi người dùng đi từ CV đã tải lên trước đó. */}
          {!uploadedResume && (
            <section className="rw-card">
              <div className="rw-flex-between candidate-create-section-head">
                <div>
                  <h2 className="rw-heading-2xl">Bước 1. Tải lên file CV</h2>
                  <p className="rw-muted-sm">Hỗ trợ PDF, DOC, DOCX. Hệ thống sẽ tự động trích xuất thông tin.</p>
                </div>
                {file && <span className="rw-badge rw-badge-green">Đã chọn</span>}
              </div>

              <div
                style={{
                  border: `2px dashed ${file ? '#22c55e' : '#cbd5e1'}`,
                  borderRadius: '10px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: file ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.2s',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = file ? '#22c55e' : '#cbd5e1'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileChange({ target: { files: [dropped] } });
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>{file ? '✅' : '📄'}</div>
                <p style={{ margin: '0 0 6px', fontWeight: '600', fontSize: '16px' }}>
                  {file ? file.name : 'Kéo thả file hoặc bấm để chọn'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>PDF, DOC, DOCX</p>
              </div>

              {file && (
                <button type="button" className="btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => setStep(2)}>
                  Tiếp tục → Chọn mẫu
                </button>
              )}
            </section>
          )}

          {/* Bước 2: Chọn mẫu CV. */}
          {(uploadedResume || file) && (
            <section className="rw-card">
              <div className="rw-flex-between candidate-create-section-head">
                <div>
                  <h2 className="rw-heading-2xl">Bước 2. Chọn mẫu CV</h2>
                  <p className="rw-muted-sm">
                    {uploadedResume
                      ? `Dùng CV: ${uploadedResume.original_filename || uploadedResume.title}`
                      : `File đã chọn: ${file?.name}`}
                    {' '}— Chọn một mẫu để phân tích và điền dữ liệu.
                  </p>
                </div>
                <span className="rw-badge rw-badge-slate">{templates.length} mẫu</span>
              </div>

              {selectedTemplate && !parsing && (
                <div className="candidate-template-action-bar">
                  <div>
                    <span className="eyebrow">Mẫu đang chọn</span>
                    <strong>{selectedTemplate.name}</strong>
                    <p>
                      {parseFailed
                        ? 'Không tự động đọc được file. Trình chỉnh sửa đã mở để bạn nhập thủ công.'
                        : 'Trình chỉnh sửa đã sẵn sàng với thông tin được điền từ file CV.'}
                    </p>
                  </div>
                  <div className="candidate-template-action-buttons">
                    <button type="button" className="btn" onClick={() => { setStep(3); setEditorModalOpen(true); }}>
                      {parseFailed ? 'Nhập thông tin thủ công' : 'Mở lại trình chỉnh sửa'}
                    </button>
                    <button
                      type="button"
                      className="rw-btn-outline-lg"
                      onClick={() => { setSelectedTemplate(null); setForm(EMPTY_FORM); setParseFailed(false); setEditorModalOpen(false); setStep(uploadedResume ? 2 : file ? 2 : 1); }}
                    >
                      Đổi mẫu
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="rw-state-default">
                  <h3>Đang tải mẫu CV...</h3>
                  <p>Hệ thống đang chuẩn bị các mẫu CV để bạn lựa chọn.</p>
                </div>
              ) : parsing ? (
                <div className="rw-state-default">
                  <h3>Đang phân tích CV...</h3>
                  <p>Hệ thống đang trích xuất thông tin từ file của bạn.</p>
                </div>
              ) : (
                <ResumeTemplateGrid
                  templates={templates}
                  selectedSlug={selectedTemplate?.slug || ''}
                  onUseTemplate={handleSelectTemplate}
                />
              )}
            </section>
          )}

          {/* Trạng thái chờ khi chưa có file. */}
          {!uploadedResume && !file && (
            <section className="rw-card rw-state-empty">
              <h3>Tải lên file CV để chọn mẫu</h3>
              <p>Sau khi tải lên, bạn sẽ chọn mẫu và hệ thống tự điền thông tin vào biểu mẫu.</p>
            </section>
          )}

          {/* Bước 3: Xác nhận mẫu đã chọn. */}
          {false && selectedTemplate && !parsing && (
            <section className="rw-card candidate-create-selected">
              <div>
                <span className="eyebrow">Mẫu đã chọn</span>
                <h2 className="rw-heading-2xl">{selectedTemplate.name}</h2>
                <p className="rw-muted-sm">
                  {parseFailed
                    ? 'Không tự động đọc được file, nhưng bạn vẫn có thể nhập thông tin thủ công theo mẫu đã chọn.'
                    : selectedTemplate.summary || selectedTemplate.description || 'Mẫu đã được điền sẵn dữ liệu từ CV của bạn.'}
                </p>
              </div>
              <div className="candidate-create-selected-actions">
                <button type="button" className="btn" onClick={() => { setStep(3); setEditorModalOpen(true); }}>
                  {parseFailed ? 'Nhập thông tin thủ công' : 'Mở trình chỉnh sửa CV'}
                </button>
                <button
                  type="button"
                  className="rw-btn-outline-lg"
                  onClick={() => { setSelectedTemplate(null); setForm(EMPTY_FORM); setParseFailed(false); setStep(uploadedResume ? 2 : file ? 2 : 1); }}
                >
                  Đổi mẫu
                </button>
              </div>
            </section>
          )}

        </div>
      </section>

      {draftSavedAt && <div className="rw-draft-hint">Nháp gần nhất: {draftSavedAt}</div>}

      {/* Trình chỉnh sửa CV. */}
      {editorModalOpen && selectedTemplate && (
        <div className="rw-modal-backdrop">
          <div className="rw-modal candidate-editor-modal">
            <div className="rw-modal-head">
              <div>
                <p className="rw-modal-kicker">Bước 3 — Kiểm tra & Tạo CV</p>
                <h3 className="rw-heading-2xl">Chỉnh sửa thông tin và xem trước CV</h3>
                <p className="rw-modal-subtitle">Mẫu: {selectedTemplate.name} · Dữ liệu đã được điền từ file CV của bạn</p>
              </div>
              <button type="button" className="rw-btn-close" onClick={() => setEditorModalOpen(false)}>
                Đóng
              </button>
            </div>

            {parseFailed && (
              <div className="rw-alert-info candidate-editor-inline-alert">
                Không đọc được dữ liệu từ file. Bạn vẫn có thể nhập thông tin thủ công và xem trước theo mẫu đã chọn.
              </div>
            )}

            <div className="rw-modal-body candidate-editor-modal-body">
              <section className="candidate-editor-form-pane">
                <ResumeForm
                  values={form}
                  templates={templates}
                  skillTags={skillTags}
                  onChange={handleChange}
                  onToggleSkillTag={toggleSkillTag}
                  onSaveDraft={handleSaveDraft}
                  onPreview={handlePreview}
                  onSubmit={handleSubmit}
                  saving={busy}
                  editingTitle="Tạo CV từ file"
                  lockTemplate
                  submitLabel="Tạo CV"
                  personalInfoDescription="Thông tin được trích xuất từ file CV đã tải lên. Kiểm tra và chỉnh sửa nếu dữ liệu chưa đúng."
                />
              </section>

              <section className="candidate-editor-preview-pane" id="cv-live-preview">
                <div className="rw-flex-between candidate-create-section-head">
                  <div>
                    <h2 className="rw-heading-2xl">Xem trước CV</h2>
                    <p className="rw-muted-sm">Nội dung thay đổi theo thông tin bạn nhập bên trái.</p>
                  </div>
                  <span className="rw-badge rw-badge-green">Bản xem trước</span>
                </div>

                <div className="candidate-create-preview-frame">
                  {previewTemplate ? (
                    <div className="candidate-live-template-wrap">
                      <LiveTemplate data={form} />
                    </div>
                  ) : (
                    <div className="rw-empty-dashed">Chưa chọn mẫu CV nên chưa có bản xem trước.</div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={handleSubmit}
                  disabled={busy}
                >
                  {busy ? 'Đang tạo...' : 'Tạo CV ngay'}
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
