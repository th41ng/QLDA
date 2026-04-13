import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes";

const AUTH_LOGIN_CONTENT = {
  eyebrow: "JOB PORTAL",
  heading: "Đăng nhập để tiếp tục hành trình nghề nghiệp",
  description:
    "Truy cập tài khoản của bạn để tìm việc, quản lý hồ sơ hoặc theo dõi hoạt động tuyển dụng trên nền tảng.",
  benefits: [
    "Truy cập nhanh vào tài khoản",
    "Quản lý hồ sơ và hoạt động dễ dàng",
    "Tiếp tục công việc chỉ với vài thao tác",
  ],
};

const AUTH_REGISTER_CONTENT = {
  candidate: {
    eyebrow: "JOB PORTAL",
    heading: "Tìm việc phù hợp và ứng tuyển nhanh",
    description:
      "Tạo CV chuyên nghiệp, khám phá việc làm phù hợp và ứng tuyển dễ dàng trên một nền tảng.",
    benefits: [
      "Tạo CV nhanh và chuyên nghiệp",
      "Tìm việc theo kỹ năng và vị trí",
      "Ứng tuyển nhanh chỉ với vài thao tác",
    ],
  },
  recruiter: {
    eyebrow: "JOB PORTAL",
    heading: "Đăng tin tuyển dụng và tìm đúng ứng viên",
    description:
      "Quản lý tin tuyển dụng, tiếp cận hồ sơ phù hợp và tối ưu quy trình tuyển dụng trên cùng một nền tảng.",
    benefits: [
      "Đăng tin tuyển dụng nhanh chóng",
      "Xem hồ sơ ứng viên tập trung",
      "Hỗ trợ sàng lọc ứng viên hiệu quả",
    ],
  },
};

const ROLE_OPTIONS = [
  {
    value: "candidate",
    label: "Ứng viên",
    hint: "Tạo CV, tìm việc và ứng tuyển nhanh",
  },
  {
    value: "recruiter",
    label: "Nhà tuyển dụng",
    hint: "Đăng tin, xem hồ sơ và sàng lọc ứng viên",
  },
];

const INITIAL_REGISTER = {
  full_name: "",
  email: "",
  password: "",
  confirm_password: "",
  agree: false,
};

const INITIAL_LOGIN = {
  email: "",
  password: "",
  remember: true,
};

const OTP_INITIAL = {
  open: false,
  code: "",
  targetEmail: "",
  purpose: "login",
  countdown: 0,
  sending: false,
  verifying: false,
  resending: false,
  message: "",
  error: "",
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const authCardRef = useRef(null);
  const otpInputRef = useRef(null);
  const didMountRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [login, setLogin] = useState(INITIAL_LOGIN);
  const [register, setRegister] = useState(INITIAL_REGISTER);
  const [errors, setErrors] = useState({});
  const [pendingRegisterPayload, setPendingRegisterPayload] = useState(null);
  const [otp, setOtp] = useState(OTP_INITIAL);

  const authMode = searchParams.get("mode") === "register" ? "register" : "login";
  const selectedRole = searchParams.get("role") === "recruiter" ? "recruiter" : "candidate";
  const isRegister = authMode === "register";
  const activeContent = isRegister ? AUTH_REGISTER_CONTENT[selectedRole] : AUTH_LOGIN_CONTENT;
  const focusRequested = Boolean(location.state?.focusAuth);
  const otpButtonLabel = isRegister ? "Đăng ký bằng OTP" : "Đăng nhập bằng OTP";

  const otpCountdownLabel = useMemo(() => {
    if (otp.countdown <= 0) return "Gửi lại mã";
    return `Gửi lại sau ${otp.countdown}s`;
  }, [otp.countdown]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      if (focusRequested) {
        authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        authCardRef.current?.focus?.();
      }
      return;
    }

    authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    authCardRef.current?.focus?.();
  }, [authMode, focusRequested]);

  useEffect(() => {
    if (!otp.open) return undefined;
    otpInputRef.current?.focus();
    if (otp.countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setOtp((current) => {
        if (current.countdown <= 1) {
          window.clearInterval(timer);
          return { ...current, countdown: 0 };
        }
        return { ...current, countdown: current.countdown - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otp.open, otp.countdown]);

  const setAuthState = (mode, role = selectedRole) => {
    const nextParams = { mode };
    if (mode === "register") {
      nextParams.role = role;
    }
    setSearchParams(nextParams, { replace: true });
    setSubmitError("");
    setErrors({});
    setLoading(false);
  };

  const setRole = (nextRole) => {
    if (!isRegister) return;
    setSearchParams({ mode: "register", role: nextRole }, { replace: true });
  };

  const validateLogin = () => {
    const nextErrors = {};
    if (!login.email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }
    if (!login.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    }
    return nextErrors;
  };

  const validateLoginOtp = () => {
    const nextErrors = {};
    if (!login.email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }
    return nextErrors;
  };

  const validateRegister = () => {
    const nextErrors = {};
    if (!register.full_name.trim()) {
      nextErrors.full_name = "Vui lòng nhập họ và tên.";
    }
    if (!register.email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(register.email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }
    if (!register.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (register.password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }
    if (!register.confirm_password) {
      nextErrors.confirm_password = "Vui lòng xác nhận mật khẩu.";
    } else if (register.password !== register.confirm_password) {
      nextErrors.confirm_password = "Mật khẩu xác nhận không khớp.";
    }
    if (!register.agree) {
      nextErrors.agree = "Bạn cần đồng ý với điều khoản và chính sách.";
    }
    return nextErrors;
  };

  const openOtpModal = (payload) => {
    setOtp({
      open: true,
      code: "",
      targetEmail: payload.email,
      purpose: payload.purpose,
      countdown: payload.resendIn || 60,
      sending: false,
      verifying: false,
      resending: false,
      message: payload.message || `Mã OTP đã được gửi đến ${payload.email}`,
      error: "",
    });
  };

  const closeOtpModal = () => {
    setOtp(OTP_INITIAL);
    setPendingRegisterPayload(null);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const nextErrors = isRegister ? validateRegister() : validateLogin();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      if (isRegister) {
        const user = await auth.registerPassword({
          full_name: register.full_name.trim(),
          email: register.email.trim(),
          password: register.password,
          role: selectedRole,
        });
        navigate(roleHome(user.role));
        return;
      }

      const user = await auth.loginWithPassword(login.email.trim(), login.password);
      navigate(roleHome(user.role));
    } catch (error) {
      setSubmitError(error.message || "Xác thực thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSend = async () => {
    setSubmitError("");
    setErrors({});
    setOtp((current) => ({ ...current, sending: true, error: "", message: "" }));

    try {
      if (authMode === "login") {
        const nextErrors = validateLoginOtp();
        if (Object.keys(nextErrors).length) {
          setErrors(nextErrors);
          return;
        }
        const response = await auth.sendOtp({ email: login.email.trim(), purpose: "login" });
        openOtpModal({
          email: response.email || login.email.trim(),
          purpose: "login",
          resendIn: response.resendIn,
          message: "Mã OTP đã được gửi đến email của bạn.",
        });
        return;
      }

      const nextErrors = validateRegister();
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }

      const payload = {
        full_name: register.full_name.trim(),
        email: register.email.trim(),
        password: register.password,
        confirm_password: register.confirm_password,
        role: selectedRole,
      };
      const response = await auth.sendOtp({
        email: payload.email,
        purpose: "register",
        role: payload.role,
        fullName: payload.full_name,
        password: payload.password,
        confirmPassword: payload.confirm_password,
      });
      setPendingRegisterPayload(payload);
      openOtpModal({
        email: response.email || payload.email,
        purpose: "register",
        resendIn: response.resendIn,
        message: "Mã OTP đã được gửi đến email của bạn.",
      });
    } catch (error) {
      setSubmitError(error.message || "Không thể gửi OTP.");
    } finally {
      setOtp((current) => ({ ...current, sending: false }));
    }
  };

  const handleOtpVerify = async (event) => {
    event.preventDefault();
    const code = otp.code.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setOtp((current) => ({ ...current, error: "OTP phải gồm 6 chữ số." }));
      return;
    }

    setOtp((current) => ({ ...current, verifying: true, error: "" }));
    try {
      const user = await auth.verifyOtp({
        email: otp.targetEmail,
        purpose: otp.purpose,
        otp: code,
      });
      closeOtpModal();
      navigate(roleHome(user.role));
    } catch (error) {
      setOtp((current) => ({
        ...current,
        error: error.message || "Xác thực OTP thất bại.",
      }));
    } finally {
      setOtp((current) => ({ ...current, verifying: false }));
    }
  };

  const handleOtpResend = async () => {
    if (otp.countdown > 0) return;
    setOtp((current) => ({ ...current, resending: true, error: "", message: "" }));
    try {
      const response = await auth.resendOtp({
        email: otp.targetEmail,
        purpose: otp.purpose,
      });
      setOtp((current) => ({
        ...current,
        countdown: response.resendIn || 60,
        message: "Mã OTP mới đã được gửi đến email của bạn.",
      }));
      if (otp.purpose === "register" && pendingRegisterPayload) {
        setPendingRegisterPayload((current) => ({ ...current }));
      }
    } catch (error) {
      setOtp((current) => ({
        ...current,
        error: error.message || "Không thể gửi lại OTP.",
      }));
    } finally {
      setOtp((current) => ({ ...current, resending: false }));
    }
  };

  return (
    <section className="auth-shell auth-page-shell">
      <div className="auth-layout auth-layout--compact">
        <aside className="auth-brand-panel" key={isRegister ? selectedRole : "login"}>
          <div className="auth-brand-copy">
            <span className="eyebrow">{activeContent.eyebrow}</span>
            <h1>{activeContent.heading}</h1>
            <p>{activeContent.description}</p>
          </div>

          <ul className="auth-benefits auth-benefits--feature">
            {activeContent.benefits.map((item) => (
              <li key={item}>
                <span className="auth-benefit-dot" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="auth-card auth-card--clean" ref={authCardRef} tabIndex={-1}>
          <div className="auth-card-header">
            <div>
              <span className="eyebrow">JOBPORTAL</span>
              <h2>{isRegister ? "Đăng ký tài khoản" : "Đăng nhập tài khoản"}</h2>
              <p>
                {isRegister
                  ? "Tạo tài khoản để bắt đầu xây dựng hồ sơ và ứng tuyển."
                  : "Truy cập nhanh vào hệ thống của bạn."}
              </p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Chuyển chế độ xác thực">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "login"}
                className={authMode === "login" ? "tab active" : "tab"}
                onClick={() => setAuthState("login")}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "register"}
                className={authMode === "register" ? "tab active" : "tab"}
                onClick={() => setAuthState("register")}
              >
                Đăng ký
              </button>
            </div>
          </div>

          {isRegister ? (
            <div className="auth-role-switch" role="radiogroup" aria-label="Chọn vai trò">
              {ROLE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === item.value}
                  className={selectedRole === item.value ? "role-pil active" : "role-pil"}
                  onClick={() => setRole(item.value)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {submitError ? <div className="auth-alert auth-alert--error">{submitError}</div> : null}

          <form className="auth-form" onSubmit={handlePasswordSubmit} noValidate>
            {isRegister ? (
              <div className="auth-grid auth-grid--compact">
                <Field
                  label="Họ và tên"
                  error={errors.full_name}
                  input={
                    <input
                      value={register.full_name}
                      onChange={(event) => setRegister((prev) => ({ ...prev, full_name: event.target.value }))}
                      placeholder="Nhập họ và tên"
                      autoComplete="name"
                    />
                  }
                />
                <Field
                  label="Email"
                  error={errors.email}
                  input={
                    <input
                      type="email"
                      value={register.email}
                      onChange={(event) => setRegister((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="example@gmail.com"
                      autoComplete="email"
                    />
                  }
                />
                <Field
                  label="Mật khẩu"
                  error={errors.password}
                  input={
                    <PasswordField
                      value={register.password}
                      show={showPassword}
                      onToggle={() => setShowPassword((prev) => !prev)}
                      onChange={(event) => setRegister((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Nhập mật khẩu"
                    />
                  }
                />
                <Field
                  label="Xác nhận mật khẩu"
                  error={errors.confirm_password}
                  input={
                    <input
                      type={showPassword ? "text" : "password"}
                      value={register.confirm_password}
                      onChange={(event) => setRegister((prev) => ({ ...prev, confirm_password: event.target.value }))}
                      placeholder="Nhập lại mật khẩu"
                    />
                  }
                />
              </div>
            ) : (
              <div className="auth-grid auth-grid--compact">
                <Field
                  label="Email"
                  error={errors.email}
                  input={
                    <input
                      type="email"
                      value={login.email}
                      onChange={(event) => setLogin((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="example@gmail.com"
                      autoComplete="email"
                    />
                  }
                />
                <Field
                  label="Mật khẩu"
                  error={errors.password}
                  rightAction={
                    <button type="button" className="auth-link-button" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                  }
                  input={
                    <input
                      type={showPassword ? "text" : "password"}
                      value={login.password}
                      onChange={(event) => setLogin((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                    />
                  }
                />
              </div>
            )}

            {isRegister ? (
              <label className="auth-check auth-check--terms">
                <input
                  type="checkbox"
                  checked={register.agree}
                  onChange={(event) => setRegister((prev) => ({ ...prev, agree: event.target.checked }))}
                />
                <span>Tôi đồng ý với điều khoản và chính sách</span>
              </label>
            ) : (
              <div className="auth-form-meta">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={login.remember}
                    onChange={(event) => setLogin((prev) => ({ ...prev, remember: event.target.checked }))}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" className="auth-link-button">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {isRegister && errors.agree ? <div className="field-error field-error--inline">{errors.agree}</div> : null}

            <button className="btn auth-primary-btn" type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
            </button>
          </form>

          <div className="auth-divider">
            <span>Hoặc</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost auth-secondary-btn"
            onClick={handleOtpSend}
            disabled={otp.sending || loading}
            aria-label={isRegister ? "Đăng ký bằng OTP qua email" : "Đăng nhập bằng OTP qua email"}
            title="Hệ thống sẽ gửi mã OTP qua email của bạn"
          >
            {otp.sending ? "Đang gửi..." : otpButtonLabel}
          </button>
        </div>
      </div>

      {otp.open ? (
        <div className="otp-modal-backdrop" role="presentation" onClick={closeOtpModal}>
          <div
            className="otp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-modal-title"
            aria-describedby="otp-modal-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="otp-modal-head">
              <div>
                <span className="eyebrow">Xác thực OTP</span>
                <h3 id="otp-modal-title">Nhập mã OTP</h3>
                <p id="otp-modal-desc">
                  Chúng tôi đã gửi mã xác thực đến <strong>{otp.targetEmail}</strong>.
                </p>
              </div>
              <button type="button" className="auth-link-button" onClick={closeOtpModal}>
                Đóng
              </button>
            </div>

            <form className="otp-form" onSubmit={handleOtpVerify}>
              <label className="field otp-field">
                <span>Mã OTP 6 số</span>
                <input
                  ref={otpInputRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp.code}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp((current) => ({ ...current, code: nextValue, error: "" }));
                  }}
                  placeholder="123456"
                />
              </label>

              {otp.message ? <div className="auth-alert auth-alert--success">{otp.message}</div> : null}
              {otp.error ? <div className="auth-alert auth-alert--error">{otp.error}</div> : null}

              <div className="otp-actions">
                <button className="btn auth-primary-btn" type="submit" disabled={otp.verifying || otp.code.length !== 6}>
                  {otp.verifying ? "Đang xác nhận..." : "Xác nhận OTP"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost auth-secondary-btn"
                  onClick={handleOtpResend}
                  disabled={otp.resending || otp.countdown > 0}
                >
                  {otp.resending ? "Đang gửi lại..." : otpCountdownLabel}
                </button>
                <button type="button" className="auth-link-button otp-cancel" onClick={closeOtpModal}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, error, input, rightAction }) {
  return (
    <label className={error ? "field field--error" : "field"}>
      <div className="field-head">
        <span>{label}</span>
        {rightAction ? <span className="field-action">{rightAction}</span> : null}
      </div>
      {input}
      {error ? <div className="field-error">{error}</div> : null}
    </label>
  );
}

function PasswordField({ value, show, onToggle, onChange, placeholder }) {
  return (
    <div className="password-field">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" className="password-toggle" onClick={onToggle}>
        {show ? "Ẩn" : "Hiện"}
      </button>
    </div>
  );
}

function roleHome(role) {
  if (role === "recruiter") return ROUTES.recruiter.dashboard;
  if (role === "candidate") return ROUTES.candidate.profile;
  return ROUTES.home;
}
