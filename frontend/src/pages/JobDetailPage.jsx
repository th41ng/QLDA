import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { ROUTES } from "../routes";
import { useAuth } from "../context/AuthContext";

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [form, setForm] = useState({ resume_id: "", cover_letter: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.jobs.detail(id).then(setJob).catch(() => setJob(null));
    if (user?.role === "candidate") {
      api.resumes.list().then(setResumes).catch(() => setResumes([]));
    }
  }, [id, user]);

  const apply = async (event) => {
    event.preventDefault();
    try {
      await api.applications.create({ job_id: Number(id), resume_id: Number(form.resume_id), cover_letter: form.cover_letter });
      setMessage("Ứng tuyển thành công.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!job) {
    return <section className="panel"><div className="card">Job not found.</div></section>;
  }

  return (
    <>
      <section className="panel">
        <div className="job-hero">
          <div>
            <div className="card-badge">{job.company?.company_name}</div>
            <h1>{job.title}</h1>
            <p className="muted">{job.location} · {job.workplace_type} · {job.experience_level}</p>
          </div>
          <div className="salary-box">{job.salary_min} - {job.salary_max}</div>
        </div>
        <div className="detail-grid">
          <article className="card">
            <h2>Mô tả công việc</h2>
            <p>{job.description}</p>
            <h2>Yêu cầu</h2>
            <p>{job.requirements}</p>
            <h2>Trách nhiệm</h2>
            <p>{job.responsibilities}</p>
            <h2>Tags</h2>
            <p>{job.tags.map((tag) => tag.name).join(", ")}</p>
          </article>
          <article className="card">
            <h2>Ứng tuyển</h2>
            {user?.role === "candidate" ? (
              <form className="form-grid" onSubmit={apply}>
                <label>Chọn CV
                  <select value={form.resume_id} onChange={(e) => setForm({ ...form, resume_id: e.target.value })}>
                    <option value="">-- Chọn CV --</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>{resume.title} {resume.is_primary ? "(primary)" : ""}</option>
                    ))}
                  </select>
                </label>
                <label>Cover letter<textarea rows="5" value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} /></label>
                <button className="btn" type="submit">Nộp hồ sơ</button>
                {message && <p>{message}</p>}
              </form>
            ) : (
              <p>Đăng nhập candidate để ứng tuyển.</p>
            )}
          </article>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Việc làm liên quan</h2>
          <Link to={ROUTES.jobs}>Tất cả việc làm</Link>
        </div>
      </section>
    </>
  );
}
