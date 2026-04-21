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
  responsibilities, location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, vacancy_count, deadline, status, is_featured, published_at
)
VALUES
  (
    1,
    2,
    1,
    'Frontend React Developer',
    'frontend-react-developer',
    'Phát triển giao diện web cho hệ thống tuyển dụng.',
    'Tham gia xây dựng frontend React cho nền tảng tuyển dụng hiện đại.',
    'Biết React, JavaScript, HTML/CSS, REST API, tư duy UI tốt.',
    'Phát triển trang candidate và recruiter, tối ưu trải nghiệm người dùng.',
    'TP. Ho Chi Minh',
    'hybrid',
    'full-time',
    'junior',
    12000000,
    18000000,
    'VND',
    2,
    '2026-12-31',
    'published',
    1,
    CURRENT_TIMESTAMP
  ),
  (
    2,
    2,
    1,
    'Backend Flask Developer',
    'backend-flask-developer',
    'Xây dựng API và hệ thống admin Flask.',
    'Xây dựng REST API, xử lý auth, upload file, database MySQL, và dashboard admin.',
    'Flask, SQLAlchemy, MySQL, JWT, bảo mật cơ bản, xử lý file.',
    'Phát triển backend, quản lý phân quyền, làm việc với dữ liệu CV và ứng tuyển.',
    'TP. Ho Chi Minh',
    'remote',
    'full-time',
    'middle',
    15000000,
    25000000,
    'VND',
    1,
    '2026-12-31',
    'published',
    0,
    CURRENT_TIMESTAMP
  ),
  (
    3,
    2,
    1,
    'UI/UX Designer',
    'ui-ux-designer',
    'Thiết kế giao diện và trải nghiệm cho hệ thống việc làm.',
    'Tham gia thiết kế flow người dùng, visual system và UI cho candidate/recruiter.',
    'Figma, wireframe, design system, thẩm mỹ tốt.',
    'Phối hợp với frontend và product để hoàn thiện trải nghiệm người dùng.',
    'TP. Ho Chi Minh',
    'hybrid',
    'full-time',
    'middle',
    14000000,
    22000000,
    'VND',
    1,
    '2026-12-31',
    'published',
    1,
    CURRENT_TIMESTAMP
  ),
  (
    4,
    2,
    1,
    'QA Automation Engineer',
    'qa-automation-engineer',
    'Xây dựng kiểm thử và ổn định hệ thống portal.',
    'Phát triển automated test case, regression test và quality checks cho web app.',
    'Testing mindset, SQL cơ bản, validate API.',
    'Đảm bảo các bản release hoạt động tốt trên web và mobile.',
    'Remote',
    'remote',
    'full-time',
    'junior',
    10000000,
    16000000,
    'VND',
    1,
    '2026-12-31',
    'published',
    0,
    CURRENT_TIMESTAMP
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
  (2, 21);

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
  responsibilities, location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, vacancy_count, deadline, status, is_featured, published_at
)
VALUES
  (5, 4, 2, 'E-commerce Backend Engineer',   'ecommerce-backend-engineer',      'Xây dựng API cho hệ thống bán hàng đa kênh.',                          'Phát triển backend cho platform e-commerce, quản lý đơn hàng và thanh toán.', 'Node.js, SQL, REST API, caching, hệ thống đơn hàng.',             'Tối ưu hiệu năng, đảm bảo luồng checkout và tích hợp third-party.',         'TP. Ho Chi Minh', 'hybrid',  'full-time', 'middle', 18000000, 30000000, 'VND', 2, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP),
  (6, 4, 2, 'Performance Marketing Specialist', 'performance-marketing-specialist', 'Tối ưu quảng cáo và tăng trưởng doanh thu.',                           'Phụ trách quảng cáo digital, tracking, landing page và báo cáo hiệu quả.',  'Digital Marketing, SEO, communication, Excel, analytics.',         'Theo dõi ROAS, A/B testing và tối ưu chiến dịch quảng cáo.',               'TP. Ho Chi Minh', 'onsite',  'full-time', 'junior', 12000000, 20000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP),
  (7, 5, 3, 'Data Analyst',                  'data-analyst',                    'Phân tích dữ liệu doanh thu và hành vi người dùng.',                   'Tổng hợp dashboard, phân tích KPI và hỗ trợ business quyết định.',          'SQL, Excel, Power BI, tư duy phân tích.',                         'Xây dựng báo cáo định kỳ và insight cho quản lý.',                         'TP. Ho Chi Minh', 'onsite',  'full-time', 'junior', 14000000, 24000000, 'VND', 2, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP),
  (8, 5, 3, 'BI Engineer',                   'bi-engineer',                     'Xây dựng pipeline và báo cáo BI.',                                     'Phát triển dashboard và mô hình dữ liệu phục vụ báo cáo tài chính.',        'SQL, Power BI, data modeling, analytics.',                        'Tối ưu mô hình dữ liệu và trực quan hóa báo cáo.',                         'Remote',          'remote',  'contract',  'middle', 20000000, 32000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP),
  (9, 6, 4, 'Product Designer',              'product-designer',                'Thiết kế sản phẩm số cho nền tảng việc làm.',                          'Phụ trách user flow, wireframe, UI system và prototype.',                   'Figma, product thinking, UI system, teamwork.',                   'Làm việc với frontend, product và recruiter dashboard.',                    'Ha Noi',          'hybrid',  'full-time', 'middle', 16000000, 26000000, 'VND', 1, '2026-12-31', 'published', 1, CURRENT_TIMESTAMP),
  (10, 7, 5, 'Talent Acquisition Specialist', 'talent-acquisition-specialist',  'Tìm kiếm và sàng lọc ứng viên công nghệ.',                            'Quản lý nguồn ứng viên, xây dựng quan hệ với candidate và hiring manager.', 'Communication, HR mindset, sourcing, CRM.',                       'Đăng tin, phỏng vấn sơ bộ và theo dõi pipeline tuyển dụng.',               'Da Nang',         'onsite',  'full-time', 'middle', 13000000, 21000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP),
  (11, 8, 6, 'Digital Marketing Executive',  'digital-marketing-executive',     'Quản lý chiến dịch digital và nội dung quảng bá.',                    'Lập kế hoạch marketing, tối ưu nội dung và theo dõi hiệu quả.',             'Digital Marketing, SEO, communication, content.',                 'Chạy chiến dịch, đo lường KPI và phối hợp sales.',                         'TP. Ho Chi Minh', 'onsite',  'full-time', 'middle', 13000000, 21000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP),
  (12, 9, 7, 'Operations Coordinator',       'operations-coordinator',          'Điều phối vận hành và xử lý đơn hàng.',                               'Phối hợp đội vận hành, theo dõi tiến độ và tối ưu workflow.',               'Operations, communication, Excel, process thinking.',             'Đảm bảo quy trình vận hành trơn tru và theo dõi KPI.',                     'Can Tho',         'onsite',  'full-time', 'junior', 10000000, 15000000, 'VND', 1, '2026-12-31', 'published', 0, CURRENT_TIMESTAMP);

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

UPDATE job_postings
SET
  summary = 'Phát triển giao diện web cho hệ thống tuyển dụng.',
  description = 'Tham gia xây dựng frontend React cho nền tảng tuyển dụng hiện đại.',
  requirements = 'Biết React, JavaScript, HTML/CSS, REST API, tư duy UI tốt.',
  responsibilities = 'Phát triển trang candidate và recruiter, tối ưu trải nghiệm người dùng.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 1;

UPDATE job_postings
SET
  summary = 'Xây dựng API và hệ thống admin Flask.',
  description = 'Xây dựng REST API, xử lý auth, upload file, database MySQL, và dashboard admin.',
  requirements = 'Flask, SQLAlchemy, MySQL, JWT, bảo mật cơ bản, xử lý file.',
  responsibilities = 'Phát triển backend, quản lý phân quyền, làm việc với dữ liệu CV và ứng tuyển.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 2;

UPDATE job_postings
SET
  summary = 'Thiết kế giao diện và trải nghiệm cho hệ thống việc làm.',
  description = 'Tham gia thiết kế flow người dùng, visual system và UI cho candidate/recruiter.',
  requirements = 'Figma, wireframe, design system, thẩm mỹ tốt.',
  responsibilities = 'Phối hợp với frontend và product để hoàn thiện trải nghiệm người dùng.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 3;

UPDATE job_postings
SET
  summary = 'Xây dựng kiểm thử và ổn định hệ thống portal.',
  description = 'Phát triển automated test case, regression test và quality checks cho web app.',
  requirements = 'Testing mindset, SQL cơ bản, validate API.',
  responsibilities = 'Đảm bảo các bản release hoạt động tốt trên web và mobile.'
WHERE id = 4;

UPDATE job_postings
SET
  summary = 'Xây dựng API cho hệ thống bán hàng đa kênh.',
  description = 'Phát triển backend cho platform e-commerce, quản lý đơn hàng và thanh toán.',
  requirements = 'Node.js, SQL, REST API, caching, hệ thống đơn hàng.',
  responsibilities = 'Tối ưu hiệu năng, đảm bảo luồng checkout và tích hợp third-party.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 5;

UPDATE job_postings
SET
  summary = 'Tối ưu quảng cáo và tăng trưởng doanh thu.',
  description = 'Phụ trách quảng cáo digital, tracking, landing page và báo cáo hiệu quả.',
  requirements = 'Digital Marketing, SEO, communication, Excel, analytics.',
  responsibilities = 'Theo dõi ROAS, A/B testing và tối ưu chiến dịch quảng cáo.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 6;

UPDATE job_postings
SET
  summary = 'Phân tích dữ liệu doanh thu và hành vi người dùng.',
  description = 'Tổng hợp dashboard, phân tích KPI và hỗ trợ business quyết định.',
  requirements = 'SQL, Excel, Power BI, tư duy phân tích.',
  responsibilities = 'Xây dựng báo cáo định kỳ và insight cho quản lý.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 7;

UPDATE job_postings
SET
  summary = 'Xây dựng pipeline và báo cáo BI.',
  description = 'Phát triển dashboard và mô hình dữ liệu phục vụ báo cáo tài chính.',
  requirements = 'SQL, Power BI, data modeling, analytics.',
  responsibilities = 'Tối ưu mô hình dữ liệu và trực quan hóa báo cáo.'
WHERE id = 8;

UPDATE job_postings
SET
  summary = 'Thiết kế sản phẩm số cho nền tảng việc làm.',
  description = 'Phụ trách user flow, wireframe, UI system và prototype.',
  requirements = 'Figma, product thinking, UI system, teamwork.',
  responsibilities = 'Làm việc với frontend, product và recruiter dashboard.',
  location = 'Hà Nội'
WHERE id = 9;

UPDATE job_postings
SET
  summary = 'Tìm kiếm và sàng lọc ứng viên công nghệ.',
  description = 'Quản lý nguồn ứng viên, xây dựng quan hệ với candidate và hiring manager.',
  requirements = 'Communication, HR mindset, sourcing, CRM.',
  responsibilities = 'Đăng tin, phỏng vấn sơ bộ và theo dõi pipeline tuyển dụng.',
  location = 'Đà Nẵng'
WHERE id = 10;

UPDATE job_postings
SET
  summary = 'Quản lý chiến dịch digital và nội dung quảng bá.',
  description = 'Lập kế hoạch marketing, tối ưu nội dung và theo dõi hiệu quả.',
  requirements = 'Digital Marketing, SEO, communication, content.',
  responsibilities = 'Chạy chiến dịch, đo lường KPI và phối hợp sales.',
  location = 'TP. Hồ Chí Minh'
WHERE id = 11;

UPDATE job_postings
SET
  summary = 'Điều phối vận hành và xử lý đơn hàng.',
  description = 'Phối hợp đội vận hành, theo dõi tiến độ và tối ưu workflow.',
  requirements = 'Operations, communication, Excel, process thinking.',
  responsibilities = 'Đảm bảo quy trình vận hành trơn tru và theo dõi KPI.',
  location = 'Cần Thơ'
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





