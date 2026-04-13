export const ROUTES = {
  home: "/",
  auth: "/auth",
  candidate: {
    profile: "/candidate/profile",
  },
  recruiter: {
    dashboard: "/recruiter/dashboard",
  },
};

export const authRoute = (mode = "login", role = "candidate") =>
  mode === "register" ? `${ROUTES.auth}?mode=register&role=${role}` : `${ROUTES.auth}?mode=login&role=${role}`;

export const HEADER_NAV = [
  { label: "Đăng nhập", to: authRoute("login", "candidate") },
  { label: "Đăng ký", to: authRoute("register", "candidate") },
];

export const AUTH_ACTIONS = [
  { label: "Đăng nhập", mode: "login", variant: "ghost" },
  { label: "Đăng ký", mode: "register", variant: "primary" },
];

export const ROLE_NAV = {
  candidate: [
    { label: "Hồ sơ", to: ROUTES.candidate.profile },
  ],
  recruiter: [
    { label: "Dashboard", to: ROUTES.recruiter.dashboard },
  ],
};

export const FOOTER_LINKS = {
  quick: [
    { label: "Trang chủ", to: ROUTES.home },
    { label: "Đăng nhập", to: authRoute("login", "candidate") },
    { label: "Đăng ký ứng viên", to: authRoute("register", "candidate") },
    { label: "Đăng ký nhà tuyển dụng", to: authRoute("register", "recruiter") },
  ],
  support: [
    { label: "FAQ", to: ROUTES.home },
    { label: "Hướng dẫn dùng", to: ROUTES.auth },
    { label: "Chính sách", to: ROUTES.home },
  ],
  contact: [
    { label: "Email: myappweb145@gmail.com", to: "mailto:support@jobportal.vn" },
    { label: "Hotline: 1900 1234", to: "tel:19001234" },
  ],
};

export function roleHome(role) {
  if (role === "candidate") return ROUTES.candidate.profile;
  if (role === "recruiter") return ROUTES.recruiter.dashboard;
  return ROUTES.home;
}
