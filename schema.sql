CREATE DATABASE IF NOT EXISTS job_portal DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'jobportal_user'@'%' IDENTIFIED BY 'JobPortal123!';
GRANT ALL PRIVILEGES ON job_portal.* TO 'jobportal_user'@'%';
FLUSH PRIVILEGES;

USE job_portal;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS match_scores;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS resume_tags;
DROP TABLE IF EXISTS job_tags;
DROP TABLE IF EXISTS resumes;
DROP TABLE IF EXISTS cv_templates;
DROP TABLE IF EXISTS job_postings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS candidate_profiles;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'recruiter', 'candidate') NOT NULL,
  auth_method_preference ENUM('password', 'otp') NOT NULL DEFAULT 'password',
  status ENUM('active', 'locked', 'pending') NOT NULL DEFAULT 'active',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  phone VARCHAR(30),
  avatar_url VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recruiter_user_id INT NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  tax_code VARCHAR(50),
  website VARCHAR(255),
  address VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(255),
  industry VARCHAR(120),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_companies_user FOREIGN KEY (recruiter_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE candidate_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  dob DATE,
  gender VARCHAR(20),
  address VARCHAR(255),
  headline VARCHAR(200),
  summary TEXT,
  current_title VARCHAR(120),
  years_experience INT NOT NULL DEFAULT 0,
  expected_salary VARCHAR(80),
  desired_location VARCHAR(120),
  education TEXT,
  experience TEXT,
  portfolio_url VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidate_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  category_id INT NOT NULL,
  description VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tags_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_tags_category_id (category_id),
  INDEX idx_tags_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE job_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recruiter_user_id INT NOT NULL,
  company_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  summary VARCHAR(255),
  description LONGTEXT NOT NULL,
  requirements LONGTEXT NOT NULL,
  responsibilities LONGTEXT,
  benefits LONGTEXT,
  education_level ENUM('any', 'highschool', 'college', 'university', 'postgraduate') NOT NULL DEFAULT 'any',
  location VARCHAR(120) NOT NULL,
  workplace_type ENUM('onsite', 'hybrid', 'remote') NOT NULL DEFAULT 'onsite',
  employment_type ENUM('full-time', 'part-time', 'contract', 'internship') NOT NULL DEFAULT 'full-time',
  experience_level ENUM('intern', 'fresher', 'junior', 'middle', 'senior', 'lead') NOT NULL DEFAULT 'junior',
  salary_min INT,
  salary_max INT,
  salary_currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  vacancy_count INT NOT NULL DEFAULT 1,
  deadline DATE,
  status ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'published',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME,
  CONSTRAINT fk_jobs_user FOREIGN KEY (recruiter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_location (location),
  INDEX idx_jobs_experience (experience_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  source_type ENUM('manual', 'upload') NOT NULL DEFAULT 'manual',
  template_name VARCHAR(80),
  original_filename VARCHAR(255),
  stored_path VARCHAR(255),
  file_ext VARCHAR(10),
  mime_type VARCHAR(120),
  raw_text LONGTEXT,
  structured_json JSON,
  generated_pdf_path VARCHAR(255),
  generated_docx_path VARCHAR(255),
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_resumes_user (user_id),
  INDEX idx_resumes_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cv_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  summary VARCHAR(255),
  description TEXT,
  thumbnail_url VARCHAR(255),
  preview_url VARCHAR(255),
  file_format ENUM('pdf', 'docx', 'both') NOT NULL DEFAULT 'both',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cv_templates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cv_templates (
  id, name, slug, summary, description, thumbnail_url, preview_url, file_format, is_active
)
VALUES
  (
    1,
    'Modern Blue',
    'modern-blue',
    'Mẫu CV hiện đại cho ứng viên công nghệ',
    'Bố cục hiện đại, phù hợp cho lập trình viên, product và tech role.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393343/nguyen-thi-truc-mai_4010758_561084a9cd7112f2_4010758_orgnyz.pdf',
    'pdf',
    1
  ),
  (
    2,
    'ATS Clean',
    'ats-clean',
    'Thiết kế tối giản tối ưu cho hệ thống ATS',
    'Mẫu CV gọn, sạch, ưu tiên khả năng đọc máy và phỏng vấn nhanh.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393343/nguyen-thi-truc-mai_4010756_Joboko_4fd074991dc96370_4010756_rgglu9.pdf',
    'pdf',
    1
  ),
  (
    3,
    'Creative Minimal',
    'creative-minimal',
    'Mẫu CV sáng tạo cho thiết kế và marketing',
    'Thích hợp cho ứng viên thiên về sáng tạo nhưng vẫn giữ bố cục rõ ràng.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393344/nguyen-thi-truc-mai_4010752_Joboko_84c60ffaca3a6456_4010752_ag2sng.pdf',
    'pdf',
    1
  ),
  (
    4,
    'Product Designer',
    'product-designer',
    'Phù hợp cho UI/UX và product designer',
    'Tập trung vào portfolio, case study và trải nghiệm sản phẩm.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393344/nguyen-thi-truc-mai_4010753_Joboko_881080294f84b32f_4010753_ptymya.pdf',
    'pdf',
    1
  ),
  (
    5,
    'Data Analyst',
    'data-analyst',
    'Tập trung vào dữ liệu, bảng biểu và KPI',
    'Dành cho ứng viên phân tích dữ liệu, reporting và insight-driven work.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393344/nguyen-thi-truc-mai_4010748_Joboko_8250e56278eb8bea_4010748_g1muvd.pdf',
    'pdf',
    1
  ),
  (
    6,
    'HR Executive',
    'hr-executive',
    'Mẫu CV cho nhân sự và tuyển dụng',
    'Phù hợp cho HR, tuyển dụng và các vị trí quản trị nhân sự.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393344/nguyen-thi-truc-mai_4010751_Joboko_b88f4eb6aec594f1_4010751_enmjel.pdf',
    'pdf',
    1
  ),
  (
    7,
    'Marketing Pro',
    'marketing-pro',
    'Mẫu CV cho digital marketing và content',
    'Tập trung vào chiến dịch, nội dung và hiệu quả tăng trưởng.',
    NULL,
    'https://res.cloudinary.com/dqukehyry/image/upload/v1775393345/tien-dinh-bich_4010744_Joboko_cab46210c308a2a6_4010744_gbarcg.pdf',
    'pdf',
    1
  );

CREATE TABLE job_tags (
  job_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (job_id, tag_id),
  CONSTRAINT fk_job_tags_job FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE resume_tags (
  resume_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (resume_id, tag_id),
  CONSTRAINT fk_resume_tags_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT fk_resume_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_user_id INT NOT NULL,
  job_id INT NOT NULL,
  resume_id INT NOT NULL,
  cover_letter LONGTEXT,
  status ENUM('submitted', 'reviewing', 'accepted', 'rejected') NOT NULL DEFAULT 'submitted',
  recruiter_note TEXT,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT uq_candidate_job UNIQUE (candidate_user_id, job_id),
  INDEX idx_app_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  link_url VARCHAR(255),
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email VARCHAR(120) NOT NULL,
  role ENUM('admin', 'recruiter', 'candidate') NOT NULL,
  purpose ENUM('register', 'login', 'reset') NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  payload_json JSON,
  expires_at DATETIME NOT NULL,
  resend_available_at DATETIME NOT NULL,
  used_at DATETIME,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  request_ip VARCHAR(64),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_otp_email (email),
  INDEX idx_otp_purpose (purpose),
  INDEX idx_otp_request_ip (request_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE match_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  resume_id INT NOT NULL,
  candidate_user_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  breakdown_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_job FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_user FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, full_name, email, password_hash, role, auth_method_preference, status, email_verified, phone)
VALUES
  (
    1,
    'System Admin',
    'myappweb145@gmail.com',
    'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0',
    'admin',
    'password',
    'active',
    1,
    '0900000001'
  ),
  (
    2,
    'Tien Recruiter',
    '2251012132tien@ou.edu.vn',
    'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0',
    'recruiter',
    'otp',
    'active',
    1,
    '0900000002'
  ),
  (
    3,
    'Tien Candidate',
    'dinhtien09102004@gmail.com',
    'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0',
    'candidate',
    'otp',
    'active',
    1,
    '0900000003'
  );

INSERT INTO companies (id, recruiter_user_id, company_name, tax_code, website, address, description, logo_url, industry)
VALUES
  (
    1,
    2,
    'MyApp Web Solutions',
    '0312345678',
    'https://myappweb.vn',
    'Quan 1, TP. Ho Chi Minh',
    'Cong ty cong nghe tap trung phat trien san pham web va he thong tuyen dung.',
    '/static/images/company-myappweb.png',
    'Cong nghe thong tin'
  );

INSERT INTO candidate_profiles (
  id, user_id, dob, gender, address, headline, summary, current_title,
  years_experience, expected_salary, desired_location, education, experience, portfolio_url
)
VALUES
  (
    1,
    3,
    '2004-10-09',
    'male',
    'TP. Ho Chi Minh',
    'Lap trinh vien web junior',
    'Ung vien co dinh huong phat trien full-stack web, yeu thich React va Flask.',
    'Junior Web Developer',
    1,
    '12-15 trieu',
    'TP. Ho Chi Minh',
    'Dai hoc Mo TP. Ho Chi Minh',
    '01 nam thuc tap va lam du an web noi bo.',
    'https://portfolio.example.com/tien'
  );

INSERT INTO categories (id, name, slug, description)
VALUES
  (1, 'Ngành nghề', 'industry', 'Nhóm lĩnh vực/ngành nghề'),
  (2, 'Kỹ năng', 'skill', 'Nhóm kỹ năng chuyên môn'),
  (3, 'Kinh nghiệm', 'experience', 'Nhóm cấp độ kinh nghiệm'),
  (4, 'Địa điểm', 'location', 'Nhóm địa điểm làm việc'),
  (5, 'Hình thức', 'job_type', 'Nhóm loại việc làm');

INSERT INTO tags (id, name, slug, category_id, description)
VALUES
  -- Kỹ năng (category 2)
  (1,  'React',            'react',            2, 'Kỹ năng React JS'),
  (2,  'Flask',            'flask',            2, 'Kỹ năng Flask'),
  (3,  'MySQL',            'mysql',            2, 'Kỹ năng MySQL'),
  (9,  'English',          'english',          2, 'Tiếng Anh'),
  (16, 'Node.js',          'nodejs',           2, 'Kỹ năng Node.js'),
  (17, 'Python',           'python',           2, 'Kỹ năng Python'),
  (18, 'HTML/CSS',         'html-css',         2, 'Kỹ năng HTML/CSS'),
  (23, 'JavaScript',       'javascript',       2, 'Kỹ năng JavaScript'),
  (24, 'SQL',              'sql',              2, 'Kỹ năng SQL'),
  (25, 'Figma',            'figma',            2, 'Kỹ năng Figma'),
  (26, 'Power BI',         'power-bi',         2, 'Kỹ năng Power BI'),
  (27, 'Excel',            'excel',            2, 'Kỹ năng Excel'),
  (28, 'SEO',              'seo',              2, 'Kỹ năng SEO'),
  (29, 'Digital Marketing','digital-marketing',2, 'Kỹ năng Digital Marketing'),
  (30, 'Communication',    'communication',    2, 'Kỹ năng giao tiếp'),
  (31, 'Docker',           'docker',           2, 'Kỹ năng Docker/DevOps'),
  -- Ngành nghề (category 1)
  (4,  'Frontend',   'frontend',   1, 'Lĩnh vực frontend'),
  (5,  'Backend',    'backend',    1, 'Lĩnh vực backend'),
  (11, 'UI/UX',      'ui-ux',      1, 'Thiết kế trải nghiệm người dùng'),
  (12, 'Data',       'data',       1, 'Phân tích dữ liệu'),
  (13, 'QA',         'qa',         1, 'Kiểm thử phần mềm'),
  (14, 'Sales',      'sales',      1, 'Kinh doanh và bán hàng'),
  (15, 'Product',    'product',    1, 'Quản lý sản phẩm'),
  (32, 'IT',         'it',         1, 'Công nghệ thông tin'),
  (33, 'Marketing',  'marketing',  1, 'Lĩnh vực marketing'),
  (34, 'Finance',    'finance',    1, 'Lĩnh vực tài chính'),
  (35, 'HR',         'hr',         1, 'Lĩnh vực nhân sự'),
  (36, 'Operations', 'operations', 1, 'Lĩnh vực vận hành'),
  (37, 'Logistics',  'logistics',  1, 'Lĩnh vực logistics'),
  (38, 'E-commerce', 'e-commerce', 1, 'Thương mại điện tử'),
  (39, 'Design',     'design',     1, 'Lĩnh vực thiết kế'),
  -- Kinh nghiệm (category 3)
  (6,  'Junior',  'junior',  3, 'Cấp độ Junior'),
  (19, 'Fresher', 'fresher', 3, 'Cấp độ Fresher'),
  (40, 'Middle',  'middle',  3, 'Cấp độ Middle'),
  (41, 'Senior',  'senior',  3, 'Cấp độ Senior'),
  -- Hình thức (category 5)
  (21, 'Full-time',   'full-time',   5, 'Công việc toàn thời gian'),
  (22, 'Part-time',   'part-time',   5, 'Công việc bán thời gian'),
  (42, 'Contract',    'contract',    5, 'Hợp đồng ngắn hạn'),
  (43, 'Internship',  'internship',  5, 'Thực tập sinh');

INSERT INTO job_postings (
  id, recruiter_user_id, company_id, title, slug, summary, description, requirements,
  responsibilities, benefits, education_level, location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, vacancy_count, deadline, status, is_featured, published_at
)
VALUES
  (
    1, 2, 1,
    'Frontend React Developer',
    'frontend-react-developer',
    'Phát triển giao diện web hiện đại cho nền tảng tuyển dụng hàng đầu.',
    'Chúng tôi đang tìm kiếm một Frontend Developer có đam mê xây dựng giao diện người dùng chất lượng cao. Bạn sẽ tham gia trực tiếp vào việc phát triển các trang ứng viên, nhà tuyển dụng và hệ thống quản trị nội bộ.\n\nDự án sử dụng React 18, Vite, TailwindCSS và tích hợp REST API với backend Flask. Bạn sẽ được làm việc trong môi trường Agile, sprint 2 tuần, code review nghiêm túc và có mentorship từ senior.',
    'Tối thiểu 1 năm kinh nghiệm với React và JavaScript (ES6+)\nNắm vững HTML5, CSS3, responsive design\nHiểu về REST API, async/await, state management (Redux hoặc Zustand)\nKinh nghiệm với Git, biết đọc và viết code sạch\nƯu tiên: TypeScript, TailwindCSS, kinh nghiệm với Figma handoff',
    'Xây dựng và maintain các component React theo design system\nTích hợp API từ backend, xử lý trạng thái ứng dụng\nTối ưu hiệu năng trang (Lighthouse score, lazy loading)\nPhối hợp với UI/UX designer để đảm bảo pixel-perfect\nViết unit test cho component quan trọng\nTham gia code review và cải thiện codebase',
    'Thưởng hiệu suất theo quý (1–3 tháng lương)\nBảo hiểm sức khoẻ cao cấp cho nhân viên và người thân\nLaptop MacBook Pro hoặc ThinkPad theo nhu cầu\nLịch làm việc linh hoạt, không chấm công cứng nhắc\nNgân sách học tập 5 triệu/năm (khoá học, sách, hội thảo)\nTeam building hàng quý, du lịch công ty hàng năm',
    'university',
    'TP. Ho Chi Minh', 'hybrid', 'full-time', 'junior',
    12000000, 18000000, 'VND', 2, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP
  ),
  (
    2, 2, 1,
    'Backend Flask Developer',
    'backend-flask-developer',
    'Xây dựng hệ thống API và admin backend cho nền tảng việc làm.',
    'Vị trí Backend Developer với stack Python/Flask, chịu trách nhiệm thiết kế và phát triển các API phục vụ ứng dụng web và mobile.\n\nBạn sẽ làm việc trực tiếp với database MySQL, thiết kế schema, tối ưu query, xử lý authentication JWT và tích hợp các dịch vụ ngoài như email, cloud storage.',
    'Tối thiểu 2 năm kinh nghiệm Python, biết Flask hoặc FastAPI\nNắm vững SQL, thiết kế database quan hệ, ORM (SQLAlchemy)\nHiểu về JWT, OAuth2, bảo mật API cơ bản\nKinh nghiệm deploy trên Linux, biết Docker cơ bản\nƯu tiên: Redis, Celery, kinh nghiệm với hệ thống tuyển dụng hoặc HR',
    'Thiết kế và phát triển RESTful API đáp ứng yêu cầu frontend\nQuản lý database schema, migration và tối ưu query\nXây dựng hệ thống phân quyền role-based (admin, recruiter, candidate)\nXử lý upload file CV, tích hợp AI matching\nViết tài liệu API và unit test\nPhối hợp với frontend để debug và tích hợp',
    'Thưởng dự án và thưởng cuối năm cạnh tranh\nBảo hiểm xã hội, y tế, thất nghiệp đầy đủ theo luật\nRemote 100% hoặc hybrid tuỳ chọn\nMôi trường kỹ thuật cao, review code chặt chẽ\nCơ hội phát triển lên Tech Lead trong 2 năm',
    'university',
    'TP. Ho Chi Minh', 'remote', 'full-time', 'middle',
    15000000, 25000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  ),
  (
    3, 2, 1,
    'UI/UX Designer',
    'ui-ux-designer',
    'Thiết kế trải nghiệm người dùng cho hệ thống tuyển dụng B2B/B2C.',
    'Chúng tôi cần một UI/UX Designer có tư duy sản phẩm, đảm nhận toàn bộ quy trình từ research, wireframe đến visual design và handoff cho developer.\n\nBạn sẽ thiết kế cho 3 nhóm người dùng chính: ứng viên, nhà tuyển dụng và admin, đảm bảo trải nghiệm nhất quán và tối ưu conversion.',
    'Tối thiểu 2 năm kinh nghiệm UI/UX cho web/mobile\nThành thạo Figma, Auto Layout, Component system\nHiểu về UX research, user interview, usability testing\nCó portfolio thể hiện quá trình tư duy thiết kế\nƯu tiên: kinh nghiệm với sản phẩm HR/tuyển dụng, biết cơ bản HTML/CSS',
    'Nghiên cứu người dùng, xác định pain point và cơ hội cải tiến\nTạo wireframe, prototype và visual design cho các tính năng mới\nXây dựng và duy trì Design System nhất quán\nHandoff chi tiết cho developer, support trong quá trình implement\nThực hiện A/B test và phân tích kết quả\nPhối hợp với Product Manager xác định yêu cầu tính năng',
    'Thưởng KPI theo quý\nBảo hiểm sức khoẻ Bảo Việt cao cấp\nLaptop + màn hình ngoài phục vụ công việc thiết kế\nNgân sách mua plugin, font, tools Figma\nThời gian làm việc linh hoạt sáng/chiều\nCơ hội trở thành Product Designer khi sản phẩm mở rộng',
    'university',
    'TP. Ho Chi Minh', 'hybrid', 'full-time', 'middle',
    14000000, 22000000, 'VND', 1, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP
  ),
  (
    4, 2, 1,
    'QA Automation Engineer',
    'qa-automation-engineer',
    'Đảm bảo chất lượng phần mềm qua kiểm thử tự động.',
    'Vị trí QA Engineer chịu trách nhiệm xây dựng hệ thống kiểm thử tự động, giảm thiểu rủi ro trong mỗi lần release và nâng cao chất lượng sản phẩm tổng thể.\n\nBạn sẽ viết test case, automation script, và phối hợp chặt chẽ với developer để phát hiện bug sớm trong chu trình phát triển.',
    'Tối thiểu 1 năm kinh nghiệm QA hoặc testing\nBiết viết test case, test plan rõ ràng\nCó kinh nghiệm với Selenium, Playwright hoặc Cypress\nBiết SQL cơ bản để kiểm tra dữ liệu\nƯu tiên: kinh nghiệm API testing (Postman), CI/CD cơ bản',
    'Viết và maintain automated test suite cho web app\nThực hiện regression test trước mỗi release\nBáo cáo bug chi tiết, theo dõi đến khi fix\nXây dựng test data và môi trường test ổn định\nTích hợp test vào pipeline CI/CD\nĐề xuất cải tiến quy trình QA',
    'Lương cạnh tranh, review 6 tháng/lần\nBảo hiểm theo quy định nhà nước\nRemote toàn thời gian, không cần lên văn phòng\nThiết bị làm việc được hỗ trợ\nMôi trường tự chủ, ít họp hành không cần thiết',
    'college',
    'Remote', 'remote', 'full-time', 'junior',
    10000000, 16000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  );

INSERT INTO job_tags (job_id, tag_id)
VALUES
  -- job 1: Frontend React Developer
  (1, 1),  -- React
  (1, 4),  -- Frontend
  (1, 6),  -- Junior
  (1, 21), -- Full-time
  (1, 23), -- JavaScript
  (1, 32), -- IT
  -- job 2: Backend Flask Developer
  (2, 2),  -- Flask
  (2, 3),  -- MySQL
  (2, 5),  -- Backend
  (2, 17), -- Python
  (2, 40), -- Middle
  (2, 21), -- Full-time
  -- job 3: UI/UX Designer
  (3, 11), -- UI/UX
  (3, 25), -- Figma
  (3, 39), -- Design
  (3, 40), -- Middle
  (3, 21), -- Full-time
  -- job 4: QA Automation Engineer
  (4, 13), -- QA
  (4, 24), -- SQL
  (4, 6),  -- Junior
  (4, 21), -- Full-time
  (4, 32); -- IT

INSERT INTO resumes (
  id, user_id, title, source_type, template_name, original_filename, stored_path, file_ext, mime_type,
  raw_text, structured_json, generated_pdf_path, generated_docx_path, is_primary
)
VALUES
  (
    1,
    3,
    'CV React - Tien',
    'manual',
    'modern-blue',
    NULL,
    NULL,
    NULL,
    NULL,
    'Tien has experience with React, Flask, MySQL and project-based web development.',
    JSON_OBJECT(
      'full_name', 'Candidate Tien',
      'email', 'dinhtien09102004@gmail.com',
      'skills', JSON_ARRAY('React', 'Flask', 'MySQL'),
      'experience_years', 1,
      'education', 'OU',
      'objective', 'Full-stack web developer'
    ),
    '/instance/uploads/resume-cv-react-tien.pdf',
    '/instance/uploads/resume-cv-react-tien.docx',
    1
  ),
  (
    2,
    3,
    'CV Upload from file',
    'upload',
    'classic',
    'tien-cv.pdf',
    '/instance/uploads/tien-cv.pdf',
    'pdf',
    'application/pdf',
    'Uploaded CV extracted text',
    JSON_OBJECT(
      'full_name', 'Candidate Tien',
      'skills', JSON_ARRAY('Frontend', 'English'),
      'experience_years', 1
    ),
    '/instance/uploads/tien-cv-generated.pdf',
    '/instance/uploads/tien-cv-generated.docx',
    0
  ),
  (
    3,
    3,
    'CV Frontend React TypeScript',
    'manual',
    'ats-clean',
    NULL,
    NULL,
    NULL,
    NULL,
    'Frontend developer with React, JavaScript, TypeScript, HTML CSS and REST API experience. Built responsive web interfaces, reusable components and dashboard pages for recruitment products.',
    JSON_OBJECT(
      'full_name', 'Candidate Tien',
      'email', 'dinhtien09102004@gmail.com',
      'headline', 'Frontend Developer React TypeScript',
      'summary', 'Build responsive web UI with React, JavaScript, TypeScript and REST API integration.',
      'current_title', 'Frontend Developer',
      'years_experience', 1,
      'desired_location', 'TP. Ho Chi Minh',
      'education', 'OU - Information Technology',
      'experience', 'Built admin dashboard, recruitment landing page, reusable React components and REST API integration.',
      'skills', 'React, JavaScript, TypeScript, HTML/CSS, REST API',
      'skills_text', 'React, JavaScript, TypeScript, HTML/CSS, REST API',
      'additional_info', 'Portfolio with frontend projects and responsive web work.'
    ),
    '/instance/uploads/resume-frontend-react-typescript.pdf',
    '/instance/uploads/resume-frontend-react-typescript.docx',
    0
  ),
  (
    4,
    3,
    'CV Backend Python Flask SQL',
    'manual',
    'modern-blue',
    NULL,
    NULL,
    NULL,
    NULL,
    'Backend developer with Python, Flask, MySQL, SQL and REST API development experience. Built authentication, dashboard API, candidate profile API and job posting management modules.',
    JSON_OBJECT(
      'full_name', 'Candidate Tien',
      'email', 'dinhtien09102004@gmail.com',
      'headline', 'Backend Developer Python Flask SQL',
      'summary', 'Develop REST API with Python Flask, MySQL and authentication modules for web products.',
      'current_title', 'Backend Developer',
      'years_experience', 1,
      'desired_location', 'TP. Ho Chi Minh',
      'education', 'OU - Information Technology',
      'experience', 'Implemented Flask API, MySQL queries, authentication, resume management and job posting services.',
      'skills', 'Python, Flask, MySQL, SQL, REST API',
      'skills_text', 'Python, Flask, MySQL, SQL, REST API',
      'additional_info', 'Comfortable with backend debugging, API testing and database design.'
    ),
    '/instance/uploads/resume-backend-python-flask-sql.pdf',
    '/instance/uploads/resume-backend-python-flask-sql.docx',
    0
  ),
  (
    5,
    3,
    'CV Data Analyst SQL Power BI',
    'manual',
    'data-analyst',
    NULL,
    NULL,
    NULL,
    NULL,
    'Data analyst with SQL, Excel, Power BI and dashboard reporting experience. Worked on business report, KPI tracking, data cleaning and performance analysis for sales and operations.',
    JSON_OBJECT(
      'full_name', 'Candidate Tien',
      'email', 'dinhtien09102004@gmail.com',
      'headline', 'Data Analyst SQL Power BI Excel',
      'summary', 'Analyze business data, build dashboard and report KPI with SQL, Excel and Power BI.',
      'current_title', 'Junior Data Analyst',
      'years_experience', 1,
      'desired_location', 'TP. Ho Chi Minh',
      'education', 'OU - Information Systems',
      'experience', 'Built KPI dashboard, cleaned sales data, wrote SQL query and prepared weekly business report.',
      'skills', 'SQL, Excel, Power BI, Data Analysis, Reporting',
      'skills_text', 'SQL, Excel, Power BI, Data Analysis, Reporting',
      'additional_info', 'Strong interest in analytics, dashboard and business insight.'
    ),
    '/instance/uploads/resume-data-analyst-sql-powerbi.pdf',
    '/instance/uploads/resume-data-analyst-sql-powerbi.docx',
    0
  );

INSERT INTO resume_tags (resume_id, tag_id)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 6),
  (1, 21),
  (2, 1),
  (2, 4),
  (2, 6),
  (2, 21),
  (3, 1),
  (3, 18),
  (3, 23),
  (3, 4),
  (3, 6),
  (3, 21),
  (4, 2),
  (4, 3),
  (4, 17),
  (4, 24),
  (4, 5),
  (4, 6),
  (4, 21),
  (5, 12),
  (5, 24),
  (5, 26),
  (5, 27),
  (5, 6),
  (5, 21);

INSERT INTO applications (
  id, candidate_user_id, job_id, resume_id, cover_letter, status, recruiter_note, applied_at, updated_at
)
VALUES
  (
    1,
    3,
    1,
    1,
    'Em mong muon duoc tham gia phat trien he thong tuyen dung voi React.',
    'reviewing',
    'Ho so phu hop, cho phong van.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    2,
    3,
    2,
    2,
    'Ung tuyen vi tri backend Flask de phat trien API he thong.',
    'submitted',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Thêm recruiters và companies cho nhiều ngành nghề
INSERT INTO users (id, full_name, email, password_hash, role, auth_method_preference, status, email_verified)
VALUES
  (4, 'Nova Commerce HR',   'hr@novacommerce.vn',     'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1),
  (5, 'FinCore HR',          'jobs@fincore.vn',        'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1),
  (6, 'Bright Studio HR',    'hello@brightstudio.vn',  'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1),
  (7, 'GreenLeaf HR',        'careers@greenleafhr.vn', 'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1),
  (8, 'SalesPulse HR',       'sales@salespulse.vn',    'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1),
  (9, 'Atlas Logistics HR',  'careers@atlaslogistics.vn', 'scrypt:32768:8:1$6udiTiwBWgqH2QRg$7a5650eec4994b99e21e4cc2a1181b5d98df1c683d70dda134007c234ce08f6d6325492852fa1c95db00ee2fe71778b7c75bf2e60b5edccec1b69648de3f31c0', 'recruiter', 'otp', 'active', 1);

INSERT INTO companies (id, recruiter_user_id, company_name, tax_code, website, address, description, logo_url, industry)
VALUES
  (2, 4, 'Nova Commerce',      '0319876543', 'https://novacommerce.vn',      'Quan 3, TP. Ho Chi Minh', 'Doanh nghiep thuong mai dien tu tap trung vao tang truong va cong nghe.',     'https://res.cloudinary.com/dqukehyry/image/upload/v1775390271/original-ac839f228c8ebe7139e7a9cfcae7d3fa_vgpvbl.png', 'E-commerce'),
  (3, 5, 'FinCore Analytics',  '0109988776', 'https://fincore.vn',           'Quan 7, TP. Ho Chi Minh', 'Cong ty phan tich du lieu va giai phap tai chinh.',                           'https://res.cloudinary.com/dqukehyry/image/upload/v1775390270/bb19b75c7489d8dadb8b1b709bb8ee65_yoymlk.png',          'Finance'),
  (4, 6, 'Bright Studio',      '0312468024', 'https://brightstudio.vn',      'Ha Noi',                  'Studio thiet ke san pham so va giao dien cho web/mobile.',                   'https://res.cloudinary.com/dqukehyry/image/upload/v1775390271/business-logo-template-minimal-branding-design-vector_53876-136229_b4ov5l.jpg', 'Design'),
  (5, 7, 'GreenLeaf HR',       '0201357901', 'https://greenleafhr.vn',       'Da Nang',                 'Don vi tuyen dung va tu van nhan su cho doanh nghiep cong nghe.',            'https://res.cloudinary.com/dqukehyry/image/upload/v1775390271/2bfb04ad814c4995f0c537c68db5cd0b-multicolor-swirls-circle-logo_nsrgtn.png', 'HR'),
  (6, 8, 'SalesPulse',         '0508899001', 'https://salespulse.vn',        'TP. Ho Chi Minh',         'Doi ngu ban hang va tang truong doanh so cho san pham so.',                  'https://res.cloudinary.com/dqukehyry/image/upload/v1775390269/291-logo-1711991296.916_iqxlt2.svg',                   'Sales'),
  (7, 9, 'Atlas Logistics',    '0311122334', 'https://atlaslogistics.vn',    'Can Tho',                 'Doanh nghiep logistics va van hanh chuoi cung ung.',                         'https://res.cloudinary.com/dqukehyry/image/upload/v1775390270/d2c16d99034f9407fd708dfc3356c688_d9prfy.jpg',           'Logistics');

INSERT INTO job_postings (
  id, recruiter_user_id, company_id, title, slug, summary, description, requirements,
  responsibilities, benefits, education_level, location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, vacancy_count, deadline, status, is_featured, published_at
)
VALUES
  (
    5, 4, 2,
    'E-commerce Backend Engineer',
    'ecommerce-backend-engineer',
    'Xây dựng hệ thống API mạnh mẽ cho nền tảng bán hàng đa kênh.',
    'Nova Commerce đang mở rộng nền tảng e-commerce phục vụ hàng triệu đơn hàng mỗi tháng. Chúng tôi cần một Backend Engineer có kinh nghiệm xây dựng hệ thống chịu tải cao, đảm bảo luồng checkout, thanh toán và quản lý kho vận hoạt động trơn tru.\n\nBạn sẽ là một phần của đội backend 8 người, làm việc theo mô hình microservices với Node.js, PostgreSQL và Redis.',
    'Tối thiểu 3 năm kinh nghiệm backend với Node.js (TypeScript ưu tiên)\nHiểu sâu về SQL, indexing, transaction và tối ưu query\nKinh nghiệm xây dựng hệ thống đơn hàng, giỏ hàng, thanh toán\nBiết Redis caching, message queue (RabbitMQ hoặc Kafka)\nKinh nghiệm với REST API và hiểu về bảo mật (rate limiting, auth)\nƯu tiên: kinh nghiệm với Shopify, WooCommerce hoặc hệ thống tương tự',
    'Thiết kế và phát triển API cho các module: đơn hàng, kho, thanh toán\nTối ưu hiệu năng database, giảm latency cho luồng checkout\nTích hợp cổng thanh toán (VNPay, Momo, ZaloPay)\nXây dựng hệ thống notification real-time\nReview code và mentor junior developer\nĐảm bảo uptime 99.9%, xử lý sự cố nhanh chóng',
    'Thưởng hiệu suất 2–4 tháng lương/năm\nCổ phần công ty (ESOP) cho nhân viên cốt lõi\nBảo hiểm Bảo Minh cao cấp, bảo hiểm tai nạn 24/7\nLaptop ThinkPad X1 Carbon hoặc MacBook Pro\nLịch làm việc hybrid, không yêu cầu OT\nTea break hàng ngày, snack bar văn phòng\nDu lịch công ty nước ngoài hàng năm',
    'university',
    'TP. Ho Chi Minh', 'hybrid', 'full-time', 'middle',
    18000000, 30000000, 'VND', 2, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP
  ),
  (
    6, 4, 2,
    'Performance Marketing Specialist',
    'performance-marketing-specialist',
    'Tối ưu chiến dịch quảng cáo và tăng trưởng doanh thu cho e-commerce.',
    'Bạn sẽ chịu trách nhiệm toàn bộ ngân sách quảng cáo performance của Nova Commerce trên Facebook Ads, Google Ads và TikTok Ads. Mục tiêu là tối ưu ROAS, giảm CAC và tăng trưởng doanh thu bền vững.\n\nĐây là vị trí có tác động trực tiếp đến doanh thu công ty, phù hợp với người thích làm việc với số liệu và không ngại thử nghiệm.',
    'Tối thiểu 1 năm kinh nghiệm chạy quảng cáo Facebook Ads hoặc Google Ads\nHiểu các chỉ số: ROAS, CPA, CTR, CVR và cách tối ưu\nBiết dùng Google Analytics, Meta Pixel\nKỹ năng Excel/Sheets để phân tích dữ liệu\nTư duy sáng tạo trong copywriting và visual concept\nƯu tiên: kinh nghiệm với TikTok Ads, SEO cơ bản',
    'Lập kế hoạch và triển khai chiến dịch quảng cáo đa kênh\nTheo dõi, phân tích và tối ưu ngân sách theo ngày/tuần\nA/B test creative, landing page và offer\nBáo cáo hiệu quả chiến dịch hàng tuần cho quản lý\nPhối hợp với đội content tạo creative phù hợp\nNghiên cứu đối thủ và xu hướng thị trường',
    'Hoa hồng theo doanh số chiến dịch\nBảo hiểm sức khoẻ đầy đủ\nNgân sách test quảng cáo linh hoạt\nĐào tạo nội bộ từ team senior marketing\nMôi trường trẻ, năng động, kết quả được ghi nhận nhanh',
    'college',
    'TP. Ho Chi Minh', 'onsite', 'full-time', 'junior',
    12000000, 20000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  ),
  (
    7, 5, 3,
    'Data Analyst',
    'data-analyst',
    'Phân tích dữ liệu kinh doanh và hành vi người dùng cho công ty fintech.',
    'FinCore Analytics đang tìm Data Analyst để tham gia đội phân tích dữ liệu tài chính. Bạn sẽ làm việc với dữ liệu giao dịch hàng triệu records mỗi ngày, xây dựng báo cáo và cung cấp insight giúp lãnh đạo ra quyết định kinh doanh.\n\nĐây là cơ hội tốt cho người muốn làm sâu về data trong lĩnh vực finance, với cơ hội phát triển lên Data Engineer hoặc Analytics Lead.',
    'Tối thiểu 1 năm kinh nghiệm phân tích dữ liệu hoặc công việc tương tự\nThành thạo SQL (viết query phức tạp, join nhiều bảng)\nBiết Excel nâng cao hoặc Google Sheets\nCó kinh nghiệm với Power BI, Tableau hoặc Looker\nTư duy logic, kỹ năng trình bày số liệu rõ ràng\nƯu tiên: hiểu biết cơ bản về tài chính, kế toán',
    'Xây dựng và maintain dashboard báo cáo hàng ngày/tuần/tháng\nPhân tích hành vi người dùng, funnel chuyển đổi\nCung cấp insight định kỳ cho các phòng ban\nLàm việc với team kỹ thuật để cải thiện data pipeline\nThực hiện ad-hoc analysis theo yêu cầu\nTài liệu hóa quy trình và định nghĩa metrics',
    'Thưởng năm lên đến 3 tháng lương\nBảo hiểm sức khoẻ Vincare\nChi phí đào tạo và chứng chỉ được hỗ trợ (DA, SQL, Power BI)\nLàm việc trong môi trường data-driven, công cụ hiện đại\nCơ hội thăng tiến lên Data Engineer hoặc Analytics Lead\nWFH 2 ngày/tuần',
    'university',
    'TP. Ho Chi Minh', 'onsite', 'full-time', 'junior',
    14000000, 24000000, 'VND', 2, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP
  ),
  (
    8, 5, 3,
    'BI Engineer',
    'bi-engineer',
    'Xây dựng hạ tầng dữ liệu và báo cáo BI cho hệ thống tài chính.',
    'FinCore cần một BI Engineer có kinh nghiệm thiết kế data warehouse, xây dựng ETL pipeline và phát triển báo cáo phục vụ ban lãnh đạo và các phòng ban nghiệp vụ.\n\nBạn sẽ làm chủ toàn bộ luồng dữ liệu từ raw data đến dashboard cuối cùng, đảm bảo độ chính xác và tính kịp thời của thông tin.',
    'Tối thiểu 3 năm kinh nghiệm BI hoặc data engineering\nThành thạo SQL nâng cao, stored procedure, window function\nKinh nghiệm với Power BI hoặc Tableau (tạo report, DAX)\nHiểu về data modeling: star schema, data mart\nBiết ít nhất một ngôn ngữ ETL hoặc Python/dbt\nƯu tiên: kinh nghiệm với Azure Synapse, Snowflake hoặc BigQuery',
    'Thiết kế và xây dựng data warehouse từ nhiều nguồn\nPhát triển ETL pipeline ổn định, schedule tự động\nTạo các báo cáo tài chính, KPI cho ban lãnh đạo\nTối ưu hiệu năng query và mô hình dữ liệu\nDocument hóa toàn bộ data lineage\nHỗ trợ Data Analyst trong việc khai thác dữ liệu',
    'Hợp đồng dài hạn, gia hạn tự động nếu hoàn thành tốt\nPhụ cấp dự án hàng tháng\nRemote 100%, làm việc theo giờ linh hoạt\nCông cụ và phần mềm được cấp đầy đủ\nMôi trường chuyên nghiệp, ít họp, tập trung sản phẩm',
    'university',
    'Remote', 'remote', 'contract', 'middle',
    20000000, 32000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  ),
  (
    9, 6, 4,
    'Product Designer',
    'product-designer',
    'Thiết kế sản phẩm số toàn diện cho nền tảng tuyển dụng thế hệ mới.',
    'Bright Studio đang phát triển một nền tảng tuyển dụng sử dụng AI matching, cần Product Designer dẫn dắt toàn bộ trải nghiệm người dùng từ onboarding đến ứng tuyển.\n\nBạn sẽ là người duy nhất phụ trách design, có toàn quyền quyết định về UX và visual, được làm việc trực tiếp với founder và CTO.',
    'Tối thiểu 3 năm kinh nghiệm product design cho web/mobile\nThành thạo Figma (Auto Layout, Variables, Prototyping)\nHiểu về design system, component-driven design\nCó kinh nghiệm user research và usability testing\nBiết cơ bản HTML/CSS để giao tiếp tốt với developer\nPortfolio thể hiện tư duy sản phẩm, không chỉ visual đẹp\nƯu tiên: kinh nghiệm với AI product hoặc HR tech',
    'Dẫn dắt thiết kế end-to-end cho các tính năng mới\nThực hiện user research, phỏng vấn người dùng định kỳ\nXây dựng và maintain Figma design system\nHandoff chi tiết, tham gia QA quá trình implement\nCộng tác với PM và engineer trong sprint planning\nĐo lường kết quả thiết kế qua metrics thực tế',
    'Mức lương thỏa thuận cạnh tranh theo năng lực\nQuyền chọn cổ phần (Stock option) sau 1 năm\nBảo hiểm sức khoẻ toàn diện\nMàn hình LG 27 inch + iPad Pro hỗ trợ công việc\nHybrid: 3 ngày văn phòng Hà Nội, 2 ngày remote\nVăn phòng trung tâm Hà Nội, không gian sáng tạo',
    'university',
    'Ha Noi', 'hybrid', 'full-time', 'middle',
    16000000, 26000000, 'VND', 1, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP
  ),
  (
    10, 7, 5,
    'Talent Acquisition Specialist',
    'talent-acquisition-specialist',
    'Tuyển dụng nhân tài công nghệ cho các doanh nghiệp khách hàng.',
    'GreenLeaf HR là đơn vị headhunting chuyên mảng công nghệ tại Đà Nẵng. Chúng tôi cần Talent Acquisition Specialist phụ trách tìm kiếm và sàng lọc ứng viên kỹ thuật (developer, designer, data) cho danh mục khách hàng đang tăng trưởng mạnh.\n\nĐây là vị trí phù hợp với người có background IT, hiểu công nghệ nhưng muốn chuyển sang mảng HR và tuyển dụng.',
    'Tối thiểu 2 năm kinh nghiệm tuyển dụng, ưu tiên mảng IT\nHiểu cơ bản về các vị trí công nghệ (developer, QA, data)\nKỹ năng sourcing trên LinkedIn, GitHub, các diễn đàn IT\nGiao tiếp tốt, có khả năng xây dựng quan hệ với ứng viên\nBiết sử dụng ATS hoặc CRM tuyển dụng\nƯu tiên: từng làm developer hoặc có kiến thức IT thực tế',
    'Đăng tin tuyển dụng và sourcing ứng viên chủ động\nSàng lọc CV, phỏng vấn sơ bộ qua điện thoại/video\nDẫn dắt ứng viên qua từng bước của quy trình\nXây dựng và duy trì database ứng viên tiềm năng\nBáo cáo pipeline tuyển dụng hàng tuần cho khách hàng\nPhối hợp với hiring manager để hiểu rõ yêu cầu vị trí',
    'Hoa hồng tuyển dụng hấp dẫn (theo vị trí và level)\nLương cứng ổn định + bonus không giới hạn\nBảo hiểm đầy đủ theo luật\nĐào tạo nghiệp vụ HR và headhunting\nCơ hội phát triển lên Senior Recruiter hoặc Account Manager\nVăn phòng trung tâm Đà Nẵng, gần biển',
    'university',
    'Da Nang', 'onsite', 'full-time', 'middle',
    13000000, 21000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  ),
  (
    11, 8, 6,
    'Digital Marketing Executive',
    'digital-marketing-executive',
    'Quản lý toàn bộ hoạt động marketing số cho thương hiệu SalesPulse.',
    'SalesPulse đang tìm Digital Marketing Executive có kinh nghiệm thực chiến để phụ trách kênh digital, từ SEO/content đến paid ads và email marketing.\n\nBạn sẽ làm việc trực tiếp với CEO và Head of Sales, tham gia xây dựng chiến lược go-to-market cho sản phẩm SaaS B2B đang tăng trưởng nhanh.',
    'Tối thiểu 2 năm kinh nghiệm digital marketing tổng hợp\nKinh nghiệm SEO on-page, off-page và content marketing\nBiết chạy Facebook Ads hoặc Google Ads cơ bản\nKỹ năng viết content tiếng Việt tốt, chuẩn SEO\nBiết dùng Google Analytics, Search Console\nƯu tiên: kinh nghiệm B2B SaaS, email marketing (Mailchimp, HubSpot)',
    'Xây dựng và thực thi kế hoạch marketing digital hàng tháng\nQuản lý website, blog và SEO tổng thể\nTriển khai chiến dịch email marketing và nurturing\nPhối hợp với sales để tạo lead chất lượng\nTheo dõi và báo cáo KPI marketing định kỳ\nQuản lý kênh mạng xã hội và cộng đồng',
    'Lương thoả thuận theo năng lực\nBonus theo kết quả lead generation\nBảo hiểm sức khoẻ\nNgân sách marketing linh hoạt để thử nghiệm\nMôi trường startup năng động, cơ hội thăng tiến nhanh\nWFH thứ Sáu hàng tuần',
    'university',
    'TP. Ho Chi Minh', 'onsite', 'full-time', 'middle',
    13000000, 21000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  ),
  (
    12, 9, 7,
    'Operations Coordinator',
    'operations-coordinator',
    'Điều phối vận hành chuỗi cung ứng và xử lý đơn hàng logistics.',
    'Atlas Logistics cần Operations Coordinator có tư duy quy trình để hỗ trợ điều phối toàn bộ hoạt động vận hành hàng ngày, từ tiếp nhận đơn hàng, theo dõi giao vận đến xử lý khiếu nại khách hàng.\n\nBạn sẽ là cầu nối giữa kho vận, tài xế, khách hàng và bộ phận tài chính. Phù hợp với người thích môi trường hoạt động, không ngại áp lực.',
    'Tốt nghiệp Cao đẳng trở lên, ưu tiên ngành Logistics, Kinh tế\nKinh nghiệm làm việc trong môi trường vận hành, kho vận\nThành thạo Excel, Google Sheets để theo dõi số liệu\nKỹ năng giao tiếp tốt, xử lý tình huống nhanh\nCó thể đi lại trong thành phố, đôi khi đến kho\nƯu tiên: biết dùng phần mềm ERP hoặc WMS cơ bản',
    'Tiếp nhận và xác nhận đơn hàng từ khách hàng\nPhối hợp với kho và tài xế đảm bảo giao hàng đúng hạn\nTheo dõi tiến độ đơn hàng, cập nhật trạng thái realtime\nXử lý khiếu nại, hoàn hàng và bồi thường\nLập báo cáo vận hành tuần/tháng\nĐề xuất cải tiến quy trình giảm tỉ lệ lỗi',
    'Lương ổn định, tăng sau thử việc 2 tháng\nPhụ cấp xăng xe và điện thoại\nBảo hiểm xã hội đầy đủ\nĂn trưa tại văn phòng được hỗ trợ\nMôi trường làm việc thực tế, học được nhiều về logistics\nCơ hội thăng tiến lên Operations Supervisor',
    'college',
    'Can Tho', 'onsite', 'full-time', 'junior',
    10000000, 15000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP
  );

INSERT INTO job_tags (job_id, tag_id)
VALUES
  -- job 5: E-commerce Backend Engineer
  (5, 5),  -- Backend
  (5, 16), -- Node.js
  (5, 24), -- SQL
  (5, 38), -- E-commerce
  (5, 40), -- Middle
  (5, 21), -- Full-time
  -- job 6: Performance Marketing Specialist
  (6, 33), -- Marketing
  (6, 29), -- Digital Marketing
  (6, 28), -- SEO
  (6, 27), -- Excel
  (6, 6),  -- Junior
  (6, 21), -- Full-time
  -- job 7: Data Analyst
  (7, 12), -- Data
  (7, 24), -- SQL
  (7, 27), -- Excel
  (7, 26), -- Power BI
  (7, 34), -- Finance
  (7, 6),  -- Junior
  (7, 21), -- Full-time
  -- job 8: BI Engineer
  (8, 12), -- Data
  (8, 24), -- SQL
  (8, 26), -- Power BI
  (8, 34), -- Finance
  (8, 40), -- Middle
  (8, 42), -- Contract
  -- job 9: Product Designer
  (9, 39), -- Design
  (9, 25), -- Figma
  (9, 11), -- UI/UX
  (9, 15), -- Product
  (9, 40), -- Middle
  (9, 21), -- Full-time
  -- job 10: Talent Acquisition Specialist
  (10, 35), -- HR
  (10, 30), -- Communication
  (10, 40), -- Middle
  (10, 21), -- Full-time
  -- job 11: Digital Marketing Executive
  (11, 33), -- Marketing
  (11, 29), -- Digital Marketing
  (11, 28), -- SEO
  (11, 30), -- Communication
  (11, 40), -- Middle
  (11, 21), -- Full-time
  -- job 12: Operations Coordinator
  (12, 36), -- Operations
  (12, 37), -- Logistics
  (12, 27), -- Excel
  (12, 30), -- Communication
  (12, 6),  -- Junior
  (12, 21); -- Full-time

INSERT INTO match_scores (job_id, resume_id, candidate_user_id, score, breakdown_json)
VALUES
  (
    1,
    1,
    3,
    92.50,
    JSON_OBJECT('skill', 45, 'experience', 20, 'industry', 15, 'location', 12.5)
  ),
  (
    2,
    2,
    3,
    88.00,
    JSON_OBJECT('skill', 40, 'experience', 18, 'industry', 15, 'location', 15)
  );

-- Chuẩn hóa dữ liệu tiếng Việt có dấu và cập nhật logo công ty cho recruiter chính

UPDATE cv_templates
SET
  summary = 'Mẫu CV hiện đại cho ứng viên công nghệ',
  description = 'Bố cục hiện đại, phù hợp cho lập trình viên, product và tech role.'
WHERE id = 1;

UPDATE cv_templates
SET
  summary = 'Thiết kế tối giản tối ưu cho hệ thống ATS',
  description = 'Mẫu CV gọn, sạch, ưu tiên khả năng đọc máy và phỏng vấn nhanh.'
WHERE id = 2;

UPDATE cv_templates
SET
  summary = 'Mẫu CV sáng tạo cho thiết kế và marketing',
  description = 'Thích hợp cho ứng viên thiên về sáng tạo nhưng vẫn giữ bố cục rõ ràng.'
WHERE id = 3;

UPDATE cv_templates
SET
  summary = 'Phù hợp cho UI/UX và product designer',
  description = 'Tập trung vào portfolio, case study và trải nghiệm sản phẩm.'
WHERE id = 4;

UPDATE cv_templates
SET
  summary = 'Tập trung vào dữ liệu, bảng biểu và KPI',
  description = 'Dành cho ứng viên phân tích dữ liệu, reporting và insight-driven work.'
WHERE id = 5;

UPDATE cv_templates
SET
  summary = 'Mẫu CV cho nhân sự và tuyển dụng',
  description = 'Phù hợp cho HR, tuyển dụng và các vị trí quản trị nhân sự.'
WHERE id = 6;

UPDATE cv_templates
SET
  summary = 'Mẫu CV cho digital marketing và content',
  description = 'Tập trung vào chiến dịch, nội dung và hiệu quả tăng trưởng.'
WHERE id = 7;

UPDATE companies
SET
  address = 'Quận 1, TP. Hồ Chí Minh',
  description = 'Công ty công nghệ tập trung phát triển sản phẩm web và hệ thống tuyển dụng.',
  logo_url = 'https://res.cloudinary.com/dqukehyry/image/upload/v1775390271/original-ac839f228c8ebe7139e7a9cfcae7d3fa_vgpvbl.png',
  industry = 'Công nghệ thông tin'
WHERE recruiter_user_id = (
  SELECT id FROM users WHERE email = '2251012132tien@ou.edu.vn' LIMIT 1
);

UPDATE candidate_profiles
SET
  address = 'TP. Hồ Chí Minh',
  headline = 'Lập trình viên web junior',
  summary = 'Ứng viên có định hướng phát triển full-stack web, yêu thích React và Flask.',
  expected_salary = '12-15 triệu',
  desired_location = 'TP. Hồ Chí Minh',
  education = 'Đại học Mở TP. Hồ Chí Minh',
  experience = '01 năm thực tập và làm dự án web nội bộ.'
WHERE id = 1;

UPDATE categories SET name = 'Ngành nghề', description = 'Nhóm lĩnh vực/ngành nghề' WHERE id = 1;
UPDATE categories SET name = 'Kỹ năng', description = 'Nhóm kỹ năng chuyên môn' WHERE id = 2;
UPDATE categories SET name = 'Kinh nghiệm', description = 'Nhóm cấp độ kinh nghiệm' WHERE id = 3;
UPDATE categories SET name = 'Địa điểm', description = 'Nhóm địa điểm làm việc' WHERE id = 4;
UPDATE categories SET name = 'Hình thức', description = 'Nhóm loại việc làm' WHERE id = 5;

UPDATE tags SET description = 'Kỹ năng React JS' WHERE id = 1;
UPDATE tags SET description = 'Kỹ năng Flask' WHERE id = 2;
UPDATE tags SET description = 'Kỹ năng MySQL' WHERE id = 3;
UPDATE tags SET description = 'Lĩnh vực frontend' WHERE id = 4;
UPDATE tags SET description = 'Lĩnh vực backend' WHERE id = 5;
UPDATE tags SET description = 'Cấp độ Junior' WHERE id = 6;
UPDATE tags SET description = 'Tiếng Anh' WHERE id = 9;
UPDATE tags SET description = 'Thiết kế trải nghiệm người dùng' WHERE id = 11;
UPDATE tags SET description = 'Phân tích dữ liệu' WHERE id = 12;
UPDATE tags SET description = 'Kiểm thử phần mềm' WHERE id = 13;
UPDATE tags SET description = 'Kinh doanh và bán hàng' WHERE id = 14;
UPDATE tags SET description = 'Quản lý sản phẩm' WHERE id = 15;
UPDATE tags SET description = 'Kỹ năng Node.js' WHERE id = 16;
UPDATE tags SET description = 'Kỹ năng Python' WHERE id = 17;
UPDATE tags SET description = 'Kỹ năng HTML/CSS' WHERE id = 18;
UPDATE tags SET description = 'Cấp độ Fresher' WHERE id = 19;
UPDATE tags SET description = 'Công việc toàn thời gian' WHERE id = 21;
UPDATE tags SET description = 'Công việc bán thời gian' WHERE id = 22;
UPDATE tags SET description = 'Kỹ năng JavaScript' WHERE id = 23;
UPDATE tags SET description = 'Kỹ năng SQL' WHERE id = 24;
UPDATE tags SET description = 'Kỹ năng Figma' WHERE id = 25;
UPDATE tags SET description = 'Kỹ năng Power BI' WHERE id = 26;
UPDATE tags SET description = 'Kỹ năng Excel' WHERE id = 27;
UPDATE tags SET description = 'Kỹ năng SEO' WHERE id = 28;
UPDATE tags SET description = 'Kỹ năng Digital Marketing' WHERE id = 29;
UPDATE tags SET description = 'Kỹ năng giao tiếp' WHERE id = 30;
UPDATE tags SET description = 'Kỹ năng Docker/DevOps' WHERE id = 31;
UPDATE tags SET description = 'Công nghệ thông tin' WHERE id = 32;
UPDATE tags SET description = 'Lĩnh vực marketing' WHERE id = 33;
UPDATE tags SET description = 'Lĩnh vực tài chính' WHERE id = 34;
UPDATE tags SET description = 'Lĩnh vực nhân sự' WHERE id = 35;
UPDATE tags SET description = 'Lĩnh vực vận hành' WHERE id = 36;
UPDATE tags SET description = 'Lĩnh vực logistics' WHERE id = 37;
UPDATE tags SET description = 'Thương mại điện tử' WHERE id = 38;
UPDATE tags SET description = 'Lĩnh vực thiết kế' WHERE id = 39;
UPDATE tags SET description = 'Cấp độ Middle' WHERE id = 40;
UPDATE tags SET description = 'Cấp độ Senior' WHERE id = 41;
UPDATE tags SET description = 'Hợp đồng ngắn hạn' WHERE id = 42;
UPDATE tags SET description = 'Thực tập sinh' WHERE id = 43;

UPDATE job_postings SET
  summary         = 'Phát triển giao diện web hiện đại cho nền tảng tuyển dụng hàng đầu.',
  description     = 'Chúng tôi đang tìm kiếm một Frontend Developer có đam mê xây dựng giao diện người dùng chất lượng cao. Bạn sẽ tham gia trực tiếp vào việc phát triển các trang ứng viên, nhà tuyển dụng và hệ thống quản trị nội bộ.\n\nDự án sử dụng React 18, Vite, TailwindCSS và tích hợp REST API với backend Flask. Bạn sẽ được làm việc trong môi trường Agile, sprint 2 tuần, code review nghiêm túc và có mentorship từ senior.',
  requirements    = 'Tối thiểu 1 năm kinh nghiệm với React và JavaScript (ES6+)\nNắm vững HTML5, CSS3, responsive design\nHiểu về REST API, async/await, state management (Redux hoặc Zustand)\nKinh nghiệm với Git, biết đọc và viết code sạch\nƯu tiên: TypeScript, TailwindCSS, kinh nghiệm với Figma handoff',
  responsibilities= 'Xây dựng và maintain các component React theo design system\nTích hợp API từ backend, xử lý trạng thái ứng dụng\nTối ưu hiệu năng trang (Lighthouse score, lazy loading)\nPhối hợp với UI/UX designer để đảm bảo pixel-perfect\nViết unit test cho component quan trọng\nTham gia code review và cải thiện codebase',
  benefits        = 'Thưởng hiệu suất theo quý (1–3 tháng lương)\nBảo hiểm sức khoẻ cao cấp cho nhân viên và người thân\nLaptop MacBook Pro hoặc ThinkPad theo nhu cầu\nLịch làm việc linh hoạt, không chấm công cứng nhắc\nNgân sách học tập 5 triệu/năm (khoá học, sách, hội thảo)\nTeam building hàng quý, du lịch công ty hàng năm',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 1;

UPDATE job_postings SET
  summary         = 'Xây dựng hệ thống API và admin backend cho nền tảng việc làm.',
  description     = 'Vị trí Backend Developer với stack Python/Flask, chịu trách nhiệm thiết kế và phát triển các API phục vụ ứng dụng web và mobile.\n\nBạn sẽ làm việc trực tiếp với database MySQL, thiết kế schema, tối ưu query, xử lý authentication JWT và tích hợp các dịch vụ ngoài như email, cloud storage.',
  requirements    = 'Tối thiểu 2 năm kinh nghiệm Python, biết Flask hoặc FastAPI\nNắm vững SQL, thiết kế database quan hệ, ORM (SQLAlchemy)\nHiểu về JWT, OAuth2, bảo mật API cơ bản\nKinh nghiệm deploy trên Linux, biết Docker cơ bản\nƯu tiên: Redis, Celery, kinh nghiệm với hệ thống tuyển dụng hoặc HR',
  responsibilities= 'Thiết kế và phát triển RESTful API đáp ứng yêu cầu frontend\nQuản lý database schema, migration và tối ưu query\nXây dựng hệ thống phân quyền role-based (admin, recruiter, candidate)\nXử lý upload file CV, tích hợp AI matching\nViết tài liệu API và unit test\nPhối hợp với frontend để debug và tích hợp',
  benefits        = 'Thưởng dự án và thưởng cuối năm cạnh tranh\nBảo hiểm xã hội, y tế, thất nghiệp đầy đủ theo luật\nRemote 100% hoặc hybrid tuỳ chọn\nMôi trường kỹ thuật cao, review code chặt chẽ\nCơ hội phát triển lên Tech Lead trong 2 năm',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 2;

UPDATE job_postings SET
  summary         = 'Thiết kế trải nghiệm người dùng cho hệ thống tuyển dụng B2B/B2C.',
  description     = 'Chúng tôi cần một UI/UX Designer có tư duy sản phẩm, đảm nhận toàn bộ quy trình từ research, wireframe đến visual design và handoff cho developer.\n\nBạn sẽ thiết kế cho 3 nhóm người dùng chính: ứng viên, nhà tuyển dụng và admin, đảm bảo trải nghiệm nhất quán và tối ưu conversion.',
  requirements    = 'Tối thiểu 2 năm kinh nghiệm UI/UX cho web/mobile\nThành thạo Figma, Auto Layout, Component system\nHiểu về UX research, user interview, usability testing\nCó portfolio thể hiện quá trình tư duy thiết kế\nƯu tiên: kinh nghiệm với sản phẩm HR/tuyển dụng, biết cơ bản HTML/CSS',
  responsibilities= 'Nghiên cứu người dùng, xác định pain point và cơ hội cải tiến\nTạo wireframe, prototype và visual design cho các tính năng mới\nXây dựng và duy trì Design System nhất quán\nHandoff chi tiết cho developer, support trong quá trình implement\nThực hiện A/B test và phân tích kết quả\nPhối hợp với Product Manager xác định yêu cầu tính năng',
  benefits        = 'Thưởng KPI theo quý\nBảo hiểm sức khoẻ Bảo Việt cao cấp\nLaptop + màn hình ngoài phục vụ công việc thiết kế\nNgân sách mua plugin, font, tools Figma\nThời gian làm việc linh hoạt sáng/chiều\nCơ hội trở thành Product Designer khi sản phẩm mở rộng',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 3;

UPDATE job_postings SET
  summary         = 'Đảm bảo chất lượng phần mềm qua kiểm thử tự động.',
  description     = 'Vị trí QA Engineer chịu trách nhiệm xây dựng hệ thống kiểm thử tự động, giảm thiểu rủi ro trong mỗi lần release và nâng cao chất lượng sản phẩm tổng thể.\n\nBạn sẽ viết test case, automation script, và phối hợp chặt chẽ với developer để phát hiện bug sớm trong chu trình phát triển.',
  requirements    = 'Tối thiểu 1 năm kinh nghiệm QA hoặc testing\nBiết viết test case, test plan rõ ràng\nCó kinh nghiệm với Selenium, Playwright hoặc Cypress\nBiết SQL cơ bản để kiểm tra dữ liệu\nƯu tiên: kinh nghiệm API testing (Postman), CI/CD cơ bản',
  responsibilities= 'Viết và maintain automated test suite cho web app\nThực hiện regression test trước mỗi release\nBáo cáo bug chi tiết, theo dõi đến khi fix\nXây dựng test data và môi trường test ổn định\nTích hợp test vào pipeline CI/CD\nĐề xuất cải tiến quy trình QA',
  benefits        = 'Lương cạnh tranh, review 6 tháng/lần\nBảo hiểm theo quy định nhà nước\nRemote toàn thời gian, không cần lên văn phòng\nThiết bị làm việc được hỗ trợ\nMôi trường tự chủ, ít họp hành không cần thiết',
  education_level = 'college'
WHERE id = 4;

UPDATE job_postings SET
  summary         = 'Xây dựng hệ thống API mạnh mẽ cho nền tảng bán hàng đa kênh.',
  description     = 'Nova Commerce đang mở rộng nền tảng e-commerce phục vụ hàng triệu đơn hàng mỗi tháng. Chúng tôi cần một Backend Engineer có kinh nghiệm xây dựng hệ thống chịu tải cao, đảm bảo luồng checkout, thanh toán và quản lý kho vận hoạt động trơn tru.\n\nBạn sẽ là một phần của đội backend 8 người, làm việc theo mô hình microservices với Node.js, PostgreSQL và Redis.',
  requirements    = 'Tối thiểu 3 năm kinh nghiệm backend với Node.js (TypeScript ưu tiên)\nHiểu sâu về SQL, indexing, transaction và tối ưu query\nKinh nghiệm xây dựng hệ thống đơn hàng, giỏ hàng, thanh toán\nBiết Redis caching, message queue (RabbitMQ hoặc Kafka)\nKinh nghiệm với REST API và hiểu về bảo mật (rate limiting, auth)\nƯu tiên: kinh nghiệm với Shopify, WooCommerce hoặc hệ thống tương tự',
  responsibilities= 'Thiết kế và phát triển API cho các module: đơn hàng, kho, thanh toán\nTối ưu hiệu năng database, giảm latency cho luồng checkout\nTích hợp cổng thanh toán (VNPay, Momo, ZaloPay)\nXây dựng hệ thống notification real-time\nReview code và mentor junior developer\nĐảm bảo uptime 99.9%, xử lý sự cố nhanh chóng',
  benefits        = 'Thưởng hiệu suất 2–4 tháng lương/năm\nCổ phần công ty (ESOP) cho nhân viên cốt lõi\nBảo hiểm Bảo Minh cao cấp, bảo hiểm tai nạn 24/7\nLaptop ThinkPad X1 Carbon hoặc MacBook Pro\nLịch làm việc hybrid, không yêu cầu OT\nDu lịch công ty nước ngoài hàng năm',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 5;

UPDATE job_postings SET
  summary         = 'Tối ưu chiến dịch quảng cáo và tăng trưởng doanh thu cho e-commerce.',
  description     = 'Bạn sẽ chịu trách nhiệm toàn bộ ngân sách quảng cáo performance của Nova Commerce trên Facebook Ads, Google Ads và TikTok Ads. Mục tiêu là tối ưu ROAS, giảm CAC và tăng trưởng doanh thu bền vững.\n\nĐây là vị trí có tác động trực tiếp đến doanh thu công ty, phù hợp với người thích làm việc với số liệu và không ngại thử nghiệm.',
  requirements    = 'Tối thiểu 1 năm kinh nghiệm chạy quảng cáo Facebook Ads hoặc Google Ads\nHiểu các chỉ số: ROAS, CPA, CTR, CVR và cách tối ưu\nBiết dùng Google Analytics, Meta Pixel\nKỹ năng Excel/Sheets để phân tích dữ liệu\nTư duy sáng tạo trong copywriting và visual concept\nƯu tiên: kinh nghiệm với TikTok Ads, SEO cơ bản',
  responsibilities= 'Lập kế hoạch và triển khai chiến dịch quảng cáo đa kênh\nTheo dõi, phân tích và tối ưu ngân sách theo ngày/tuần\nA/B test creative, landing page và offer\nBáo cáo hiệu quả chiến dịch hàng tuần cho quản lý\nPhối hợp với đội content tạo creative phù hợp\nNghiên cứu đối thủ và xu hướng thị trường',
  benefits        = 'Hoa hồng theo doanh số chiến dịch\nBảo hiểm sức khoẻ đầy đủ\nNgân sách test quảng cáo linh hoạt\nĐào tạo nội bộ từ team senior marketing\nMôi trường trẻ, năng động, kết quả được ghi nhận nhanh',
  education_level = 'college',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 6;

UPDATE job_postings SET
  summary         = 'Phân tích dữ liệu kinh doanh và hành vi người dùng cho công ty fintech.',
  description     = 'FinCore Analytics đang tìm Data Analyst để tham gia đội phân tích dữ liệu tài chính. Bạn sẽ làm việc với dữ liệu giao dịch hàng triệu records mỗi ngày, xây dựng báo cáo và cung cấp insight giúp lãnh đạo ra quyết định kinh doanh.\n\nĐây là cơ hội tốt cho người muốn làm sâu về data trong lĩnh vực finance, với cơ hội phát triển lên Data Engineer hoặc Analytics Lead.',
  requirements    = 'Tối thiểu 1 năm kinh nghiệm phân tích dữ liệu hoặc công việc tương tự\nThành thạo SQL (viết query phức tạp, join nhiều bảng)\nBiết Excel nâng cao hoặc Google Sheets\nCó kinh nghiệm với Power BI, Tableau hoặc Looker\nTư duy logic, kỹ năng trình bày số liệu rõ ràng\nƯu tiên: hiểu biết cơ bản về tài chính, kế toán',
  responsibilities= 'Xây dựng và maintain dashboard báo cáo hàng ngày/tuần/tháng\nPhân tích hành vi người dùng, funnel chuyển đổi\nCung cấp insight định kỳ cho các phòng ban\nLàm việc với team kỹ thuật để cải thiện data pipeline\nThực hiện ad-hoc analysis theo yêu cầu\nTài liệu hóa quy trình và định nghĩa metrics',
  benefits        = 'Thưởng năm lên đến 3 tháng lương\nBảo hiểm sức khoẻ Vincare\nChi phí đào tạo và chứng chỉ được hỗ trợ (DA, SQL, Power BI)\nCơ hội thăng tiến lên Data Engineer hoặc Analytics Lead\nWFH 2 ngày/tuần',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 7;

UPDATE job_postings SET
  summary         = 'Xây dựng hạ tầng dữ liệu và báo cáo BI cho hệ thống tài chính.',
  description     = 'FinCore cần một BI Engineer có kinh nghiệm thiết kế data warehouse, xây dựng ETL pipeline và phát triển báo cáo phục vụ ban lãnh đạo và các phòng ban nghiệp vụ.\n\nBạn sẽ làm chủ toàn bộ luồng dữ liệu từ raw data đến dashboard cuối cùng, đảm bảo độ chính xác và tính kịp thời của thông tin.',
  requirements    = 'Tối thiểu 3 năm kinh nghiệm BI hoặc data engineering\nThành thạo SQL nâng cao, stored procedure, window function\nKinh nghiệm với Power BI hoặc Tableau (tạo report, DAX)\nHiểu về data modeling: star schema, data mart\nBiết ít nhất một ngôn ngữ ETL hoặc Python/dbt\nƯu tiên: kinh nghiệm với Azure Synapse, Snowflake hoặc BigQuery',
  responsibilities= 'Thiết kế và xây dựng data warehouse từ nhiều nguồn\nPhát triển ETL pipeline ổn định, schedule tự động\nTạo các báo cáo tài chính, KPI cho ban lãnh đạo\nTối ưu hiệu năng query và mô hình dữ liệu\nDocument hóa toàn bộ data lineage\nHỗ trợ Data Analyst trong việc khai thác dữ liệu',
  benefits        = 'Hợp đồng dài hạn, gia hạn tự động nếu hoàn thành tốt\nPhụ cấp dự án hàng tháng\nRemote 100%, làm việc theo giờ linh hoạt\nCông cụ và phần mềm được cấp đầy đủ\nMôi trường chuyên nghiệp, ít họp, tập trung sản phẩm',
  education_level = 'university'
WHERE id = 8;

UPDATE job_postings SET
  summary         = 'Thiết kế sản phẩm số toàn diện cho nền tảng tuyển dụng thế hệ mới.',
  description     = 'Bright Studio đang phát triển một nền tảng tuyển dụng sử dụng AI matching, cần Product Designer dẫn dắt toàn bộ trải nghiệm người dùng từ onboarding đến ứng tuyển.\n\nBạn sẽ là người duy nhất phụ trách design, có toàn quyền quyết định về UX và visual, được làm việc trực tiếp với founder và CTO.',
  requirements    = 'Tối thiểu 3 năm kinh nghiệm product design cho web/mobile\nThành thạo Figma (Auto Layout, Variables, Prototyping)\nHiểu về design system, component-driven design\nCó kinh nghiệm user research và usability testing\nBiết cơ bản HTML/CSS để giao tiếp tốt với developer\nPortfolio thể hiện tư duy sản phẩm, không chỉ visual đẹp\nƯu tiên: kinh nghiệm với AI product hoặc HR tech',
  responsibilities= 'Dẫn dắt thiết kế end-to-end cho các tính năng mới\nThực hiện user research, phỏng vấn người dùng định kỳ\nXây dựng và maintain Figma design system\nHandoff chi tiết, tham gia QA quá trình implement\nCộng tác với PM và engineer trong sprint planning\nĐo lường kết quả thiết kế qua metrics thực tế',
  benefits        = 'Mức lương thỏa thuận cạnh tranh theo năng lực\nQuyền chọn cổ phần (Stock option) sau 1 năm\nBảo hiểm sức khoẻ toàn diện\nMàn hình LG 27 inch + iPad Pro hỗ trợ công việc\nHybrid: 3 ngày văn phòng Hà Nội, 2 ngày remote\nVăn phòng trung tâm Hà Nội, không gian sáng tạo',
  education_level = 'university',
  location        = 'Hà Nội'
WHERE id = 9;

UPDATE job_postings SET
  summary         = 'Tuyển dụng nhân tài công nghệ cho các doanh nghiệp khách hàng.',
  description     = 'GreenLeaf HR là đơn vị headhunting chuyên mảng công nghệ tại Đà Nẵng. Chúng tôi cần Talent Acquisition Specialist phụ trách tìm kiếm và sàng lọc ứng viên kỹ thuật (developer, designer, data) cho danh mục khách hàng đang tăng trưởng mạnh.\n\nĐây là vị trí phù hợp với người có background IT, hiểu công nghệ nhưng muốn chuyển sang mảng HR và tuyển dụng.',
  requirements    = 'Tối thiểu 2 năm kinh nghiệm tuyển dụng, ưu tiên mảng IT\nHiểu cơ bản về các vị trí công nghệ (developer, QA, data)\nKỹ năng sourcing trên LinkedIn, GitHub, các diễn đàn IT\nGiao tiếp tốt, có khả năng xây dựng quan hệ với ứng viên\nBiết sử dụng ATS hoặc CRM tuyển dụng\nƯu tiên: từng làm developer hoặc có kiến thức IT thực tế',
  responsibilities= 'Đăng tin tuyển dụng và sourcing ứng viên chủ động\nSàng lọc CV, phỏng vấn sơ bộ qua điện thoại/video\nDẫn dắt ứng viên qua từng bước của quy trình\nXây dựng và duy trì database ứng viên tiềm năng\nBáo cáo pipeline tuyển dụng hàng tuần cho khách hàng\nPhối hợp với hiring manager để hiểu rõ yêu cầu vị trí',
  benefits        = 'Hoa hồng tuyển dụng hấp dẫn (theo vị trí và level)\nLương cứng ổn định + bonus không giới hạn\nBảo hiểm đầy đủ theo luật\nĐào tạo nghiệp vụ HR và headhunting\nCơ hội phát triển lên Senior Recruiter hoặc Account Manager\nVăn phòng trung tâm Đà Nẵng, gần biển',
  education_level = 'university',
  location        = 'Đà Nẵng'
WHERE id = 10;

UPDATE job_postings SET
  summary         = 'Quản lý toàn bộ hoạt động marketing số cho thương hiệu SalesPulse.',
  description     = 'SalesPulse đang tìm Digital Marketing Executive có kinh nghiệm thực chiến để phụ trách kênh digital, từ SEO/content đến paid ads và email marketing.\n\nBạn sẽ làm việc trực tiếp với CEO và Head of Sales, tham gia xây dựng chiến lược go-to-market cho sản phẩm SaaS B2B đang tăng trưởng nhanh.',
  requirements    = 'Tối thiểu 2 năm kinh nghiệm digital marketing tổng hợp\nKinh nghiệm SEO on-page, off-page và content marketing\nBiết chạy Facebook Ads hoặc Google Ads cơ bản\nKỹ năng viết content tiếng Việt tốt, chuẩn SEO\nBiết dùng Google Analytics, Search Console\nƯu tiên: kinh nghiệm B2B SaaS, email marketing (Mailchimp, HubSpot)',
  responsibilities= 'Xây dựng và thực thi kế hoạch marketing digital hàng tháng\nQuản lý website, blog và SEO tổng thể\nTriển khai chiến dịch email marketing và nurturing\nPhối hợp với sales để tạo lead chất lượng\nTheo dõi và báo cáo KPI marketing định kỳ\nQuản lý kênh mạng xã hội và cộng đồng',
  benefits        = 'Lương thoả thuận theo năng lực\nBonus theo kết quả lead generation\nBảo hiểm sức khoẻ\nNgân sách marketing linh hoạt để thử nghiệm\nMôi trường startup năng động, cơ hội thăng tiến nhanh\nWFH thứ Sáu hàng tuần',
  education_level = 'university',
  location        = 'TP. Hồ Chí Minh'
WHERE id = 11;

UPDATE job_postings SET
  summary         = 'Điều phối vận hành chuỗi cung ứng và xử lý đơn hàng logistics.',
  description     = 'Atlas Logistics cần Operations Coordinator có tư duy quy trình để hỗ trợ điều phối toàn bộ hoạt động vận hành hàng ngày, từ tiếp nhận đơn hàng, theo dõi giao vận đến xử lý khiếu nại khách hàng.\n\nBạn sẽ là cầu nối giữa kho vận, tài xế, khách hàng và bộ phận tài chính. Phù hợp với người thích môi trường hoạt động, không ngại áp lực.',
  requirements    = 'Tốt nghiệp Cao đẳng trở lên, ưu tiên ngành Logistics, Kinh tế\nKinh nghiệm làm việc trong môi trường vận hành, kho vận\nThành thạo Excel, Google Sheets để theo dõi số liệu\nKỹ năng giao tiếp tốt, xử lý tình huống nhanh\nCó thể đi lại trong thành phố, đôi khi đến kho\nƯu tiên: biết dùng phần mềm ERP hoặc WMS cơ bản',
  responsibilities= 'Tiếp nhận và xác nhận đơn hàng từ khách hàng\nPhối hợp với kho và tài xế đảm bảo giao hàng đúng hạn\nTheo dõi tiến độ đơn hàng, cập nhật trạng thái realtime\nXử lý khiếu nại, hoàn hàng và bồi thường\nLập báo cáo vận hành tuần/tháng\nĐề xuất cải tiến quy trình giảm tỉ lệ lỗi',
  benefits        = 'Lương ổn định, tăng sau thử việc 2 tháng\nPhụ cấp xăng xe và điện thoại\nBảo hiểm xã hội đầy đủ\nĂn trưa tại văn phòng được hỗ trợ\nMôi trường làm việc thực tế, học được nhiều về logistics\nCơ hội thăng tiến lên Operations Supervisor',
  education_level = 'college',
  location        = 'Cần Thơ'
WHERE id = 12;

UPDATE applications
SET
  cover_letter = 'Em mong muốn được tham gia phát triển hệ thống tuyển dụng với React.',
  recruiter_note = 'Hồ sơ phù hợp, chờ phỏng vấn.'
WHERE id = 1;

UPDATE applications
SET
  cover_letter = 'Ứng tuyển vị trí backend Flask để phát triển API hệ thống.'
WHERE id = 2;

UPDATE companies SET
  address = 'Quận 3, TP. Hồ Chí Minh',
  description = 'Doanh nghiệp thương mại điện tử tập trung vào tăng trưởng và công nghệ.'
WHERE id = 2;

UPDATE companies SET
  address = 'Quận 7, TP. Hồ Chí Minh',
  description = 'Công ty phân tích dữ liệu và giải pháp tài chính.'
WHERE id = 3;

UPDATE companies SET
  address = 'Hà Nội',
  description = 'Studio thiết kế sản phẩm số và giao diện cho web/mobile.'
WHERE id = 4;

UPDATE companies SET
  address = 'Đà Nẵng',
  description = 'Đơn vị tuyển dụng và tư vấn nhân sự cho doanh nghiệp công nghệ.'
WHERE id = 5;

UPDATE companies SET
  address = 'TP. Hồ Chí Minh',
  description = 'Đội ngũ bán hàng và tăng trưởng doanh số cho sản phẩm số.'
WHERE id = 6;

UPDATE companies SET
  address = 'Cần Thơ',
  description = 'Doanh nghiệp logistics và vận hành chuỗi cung ứng.'
WHERE id = 7;





UPDATE candidate_profiles
SET
  headline = 'Frontend / Backend / Data junior',
  summary = 'Ứng viên định hướng phát triển theo 3 hướng frontend React, backend Python Flask và phân tích dữ liệu với SQL Power BI.',
  current_title = 'Junior Web Developer',
  years_experience = 1,
  expected_salary = '12-18 triệu',
  desired_location = 'TP. Hồ Chí Minh',
  education = 'Đại học Mở TP. Hồ Chí Minh - Công nghệ thông tin / Hệ thống thông tin',
  experience = 'Có kinh nghiệm thực tập và làm dự án web với React, JavaScript, Python Flask, MySQL, SQL, dashboard và report.',
  portfolio_url = 'https://portfolio.example.com/tien'
WHERE id = 1;

UPDATE job_postings
SET
  summary = 'Phát triển giao diện React, TypeScript và REST API cho nền tảng tuyển dụng.',
  description = 'Vị trí này phù hợp với ứng viên có kinh nghiệm React, JavaScript, TypeScript, HTML/CSS và phát triển giao diện web responsive. Bạn sẽ xây dựng candidate dashboard, recruiter dashboard, form quản lý CV và các trang landing page cho nền tảng tuyển dụng.',
  requirements = 'Ít nhất 1 năm kinh nghiệm với React, JavaScript, TypeScript, HTML/CSS và REST API. Biết responsive web, component reuse, state management và làm việc với Figma handoff.',
  responsibilities = 'Phát triển giao diện React, tích hợp REST API, tối ưu responsive web, xây dựng reusable component và phối hợp với backend để hoàn thiện dashboard quản trị.',
  benefits = 'Thưởng hiệu suất, hybrid linh hoạt, học tập về React TypeScript và có mentor frontend.',
  location = 'TP. Hồ Chí Minh',
  workplace_type = 'hybrid',
  employment_type = 'full-time',
  experience_level = 'junior'
WHERE id = 1;

UPDATE job_postings
SET
  summary = 'Xây dựng backend Python Flask, MySQL và REST API cho hệ thống quản lý việc làm.',
  description = 'Vị trí này phù hợp với ứng viên có kinh nghiệm Python, Flask, MySQL, SQL và xây dựng REST API. Bạn sẽ phát triển API cho candidate profile, resume management, job posting và authentication module.',
  requirements = 'Ít nhất 1 năm kinh nghiệm với Python, Flask, MySQL, SQL, REST API và JWT auth. Ưu tiên biết debug backend, ORM và database design.',
  responsibilities = 'Phát triển Flask API, tối ưu MySQL query, xây dựng authentication, xử lý resume management và hỗ trợ tích hợp frontend.',
  benefits = 'Remote linh hoạt, được phát triển về backend architecture, API design và database optimization.',
  location = 'TP. Hồ Chí Minh',
  workplace_type = 'remote',
  employment_type = 'full-time',
  experience_level = 'junior',
  salary_min = 12000000,
  salary_max = 20000000
WHERE id = 2;

UPDATE job_postings
SET
  summary = 'Phân tích dữ liệu kinh doanh, dashboard KPI và báo cáo SQL Power BI.',
  description = 'Vị trí này phù hợp với ứng viên có kinh nghiệm SQL, Excel, Power BI, data analysis và dashboard reporting. Bạn sẽ xử lý dữ liệu kinh doanh, tạo KPI dashboard và phân tích hiệu quả vận hành.',
  requirements = 'Ít nhất 1 năm kinh nghiệm với SQL, Excel, Power BI, report dashboard và business analysis. Biết làm sạch dữ liệu, viết query và trình bày insight rõ ràng.',
  responsibilities = 'Viết SQL query, làm sạch dữ liệu, xây dựng Power BI dashboard, theo dõi KPI và lập báo cáo tuần tháng cho phòng kinh doanh và vận hành.',
  benefits = 'WFH 2 ngày mỗi tuần, được học thêm về dashboard, BI và business insight.',
  location = 'TP. Hồ Chí Minh',
  workplace_type = 'hybrid',
  employment_type = 'full-time',
  experience_level = 'junior',
  salary_min = 12000000,
  salary_max = 18000000
WHERE id = 7;