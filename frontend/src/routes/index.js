export const ROUTES = {
  home: "/",
  auth: "/auth",
  jobs: "/jobs",
  jobDetail: (id = ":id") => `/jobs/${id}`,
  candidate: {
    profile: "/candidate/profile",
    resumes: "/candidate/resumes",
    resumeCreate: "/candidate/resumes/create",
    templates: "/candidate/templates",
    applications: "/candidate/applications",
    employers: "/candidate/employers",
  },
  recruiter: {
    dashboard: "/recruiter/dashboard",
    jobs: "/recruiter/jobs",
    jobCreate: "/recruiter/jobs/new",
    jobEdit: (id = ":id") => `/recruiter/jobs/${id}/edit`,
    screening: "/recruiter/cv-screening",
    applications: "/recruiter/applications",
    company: "/recruiter/company",
    profile: "/recruiter/profile",
  },
};

export const homeAnchor = (id) => `${ROUTES.home}#${id}`;

export const authRoute = (mode = "login", role = "candidate") =>
  mode === "register" ? `${ROUTES.auth}?mode=register&role=${role}` : `${ROUTES.auth}?mode=login`;

export const HEADER_NAV = [
  { label: "Việc làm", to: ROUTES.jobs },
  { label: "Nhà tuyển dụng", to: homeAnchor("employers") },
  { label: "Tạo CV", to: authRoute("register", "candidate") },
  { label: "Đăng tin tuyển dụng", to: authRoute("register", "recruiter") },
];

export const AUTH_ACTIONS = [
  { label: "Đăng nhập", mode: "login", variant: "ghost" },
  { label: "Đăng ký", mode: "register", variant: "primary" },
];

export const ROLE_NAV = {
  candidate: [
    { label: "Hồ sơ", to: ROUTES.candidate.profile },
    { label: "CV của tôi", to: ROUTES.candidate.resumes },
    { label: "Tạo CV", to: ROUTES.candidate.resumeCreate },
    { label: "Ứng tuyển", to: ROUTES.candidate.applications },
    { label: "Nhà tuyển dụng", to: ROUTES.candidate.employers },
  ],
  recruiter: [
    { label: "Dashboard", to: ROUTES.recruiter.dashboard },
    { label: "Tin tuyển dụng", to: ROUTES.recruiter.jobs },
    { label: "Sàng lọc CV", to: ROUTES.recruiter.screening },
    { label: "Ứng viên", to: ROUTES.recruiter.applications },
    { label: "Công ty", to: ROUTES.recruiter.company },
  ],
};

export const FOOTER_LINKS = {
  quick: [
    { label: "Trang chủ", to: ROUTES.home },
    { label: "Việc làm", to: ROUTES.jobs },
    { label: "Tạo CV", to: authRoute("register", "candidate") },
    { label: "Đăng tin tuyển dụng", to: authRoute("register", "recruiter") },
  ],
  support: [
    { label: "FAQ", to: ROUTES.jobs },
    { label: "Hướng dẫn dùng", to: ROUTES.auth },
    { label: "Chính sách", to: ROUTES.home },
  ],
  contact: [
    { label: "Email: myappweb145@gmail.com", to: "mailto:support@jobportal.vn" },
    { label: "Hotline: 1900 1234", to: "tel:19001234" },
  ],
};

export function roleHome(role) {
  if (role === "admin") return ROUTES.admin.dashboard;
  if (role === "candidate") return ROUTES.candidate.profile;
  if (role === "recruiter") return ROUTES.recruiter.dashboard;
  return ROUTES.home;
}