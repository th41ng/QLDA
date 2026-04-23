export const JOB_STATUS_OPTIONS = [
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đang đăng" },
  { value: "closed", label: "Đã đóng" },
];

export const WORKPLACE_OPTIONS = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

export const EMPLOYMENT_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

export const EXPERIENCE_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

export const EDUCATION_OPTIONS = [
  { value: "any", label: "Không yêu cầu" },
  { value: "highschool", label: "THPT" },
  { value: "college", label: "Cao đẳng" },
  { value: "university", label: "Đại học" },
  { value: "postgraduate", label: "Thạc sĩ / Sau đại học" },
];

export const CURRENCY_OPTIONS = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
];

export const DEFAULT_JOB_FORM = {
  id: null,
  title: "",
  slug: "",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  location: "",
  workplace_type: "onsite",
  employment_type: "full-time",
  experience_level: "junior",
  salary_min: "",
  salary_max: "",
  salary_currency: "VND",
  vacancy_count: 1,
  benefits: "",
  education_level: "any",
  deadline: "",
  status: "published",
  is_featured: false,
  tag_ids: [],
};

export function slugifyText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Chưa cập nhật";
  }
}

export function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Chưa cập nhật";
  }
}

export function mapStatusLabel(status) {
  if (status === "published") return "Đang đăng";
  if (status === "closed") return "Đã đóng";
  return "Nháp";
}

export function mapWorkplaceLabel(value) {
  const found = WORKPLACE_OPTIONS.find((item) => item.value === value);
  return found ? found.label : "On-site";
}

export function mapEmploymentLabel(value) {
  const found = EMPLOYMENT_OPTIONS.find((item) => item.value === value);
  return found ? found.label : "Full-time";
}

export function mapExperienceLabel(value) {
  const found = EXPERIENCE_OPTIONS.find((item) => item.value === value);
  return found ? found.label : "Junior";
}

export function formatSalary(job) {
  const min = job?.salary_min === "" || job?.salary_min == null ? null : Number(job.salary_min);
  const max = job?.salary_max === "" || job?.salary_max == null ? null : Number(job.salary_max);
  const currency = job?.salary_currency || "VND";
  if (!min && !max) return "Thỏa thuận";
  const formatter = new Intl.NumberFormat("vi-VN");
  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)} ${currency}`;
  if (min) return `Từ ${formatter.format(min)} ${currency}`;
  return `Đến ${formatter.format(max)} ${currency}`;
}

export function buildJobFormFromJob(job) {
  if (!job) return { ...DEFAULT_JOB_FORM };
  return {
    id: job.id,
    title: job.title || "",
    slug: job.slug || "",
    summary: job.summary || "",
    description: job.description || "",
    responsibilities: job.responsibilities || "",
    requirements: job.requirements || "",
    location: job.location || "",
    workplace_type: job.workplace_type || "onsite",
    employment_type: job.employment_type || "full-time",
    experience_level: job.experience_level || "junior",
    salary_min: job.salary_min ?? "",
    salary_max: job.salary_max ?? "",
    salary_currency: job.salary_currency || "VND",
    vacancy_count: job.vacancy_count ?? 1,
    benefits: job.benefits || "",
    education_level: job.education_level || "any",
    deadline: job.deadline || "",
    status: job.status || "published",
    is_featured: Boolean(job.is_featured),
    tag_ids: Array.isArray(job.tags) ? job.tags.map((tag) => tag.id) : [],
  };
}

export function buildJobPayload(form) {
  const payload = {
    title: String(form.title || "").trim(),
    slug: String(form.slug || "").trim(),
    summary: String(form.summary || "").trim(),
    description: String(form.description || "").trim(),
    responsibilities: String(form.responsibilities || "").trim(),
    requirements: String(form.requirements || "").trim(),
    location: String(form.location || "").trim(),
    workplace_type: form.workplace_type || "onsite",
    employment_type: form.employment_type || "full-time",
    experience_level: form.experience_level || "junior",
    salary_currency: form.salary_currency || "VND",
    salary_min: form.salary_min === "" ? null : Number(form.salary_min),
    salary_max: form.salary_max === "" ? null : Number(form.salary_max),
    vacancy_count: form.vacancy_count === "" ? 1 : Number(form.vacancy_count),
    benefits: String(form.benefits || "").trim(),
    education_level: form.education_level || "any",
    deadline: form.deadline || "",
    status: form.status || "published",
    is_featured: Boolean(form.is_featured),
    tag_ids: Array.isArray(form.tag_ids) ? form.tag_ids : [],
  };
  if (!payload.slug) {
    payload.slug = slugifyText(payload.title);
  }
  return payload;
}
