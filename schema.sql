CREATE DATABASE IF NOT EXISTS job_portal DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'jobportal_user'@'%' IDENTIFIED BY 'JobPortal123!';
GRANT ALL PRIVILEGES ON job_portal.* TO 'jobportal_user'@'%';
FLUSH PRIVILEGES;

USE job_portal;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS match_scores;
DROP TABLE IF EXISTS otp_codes;
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
  status ENUM('submitted', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted',
  recruiter_note TEXT,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT uq_candidate_job UNIQUE (candidate_user_id, job_id),
  INDEX idx_app_status (status)
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
  (1, 'React', 'react', 2, 'Kỹ năng React JS'),
  (2, 'Flask', 'flask', 2, 'Kỹ năng Flask'),
  (3, 'MySQL', 'mysql', 2, 'Kỹ năng MySQL'),
  (4, 'Frontend', 'frontend', 1, 'Lĩnh vực frontend'),
  (5, 'Backend', 'backend', 1, 'Lĩnh vực backend'),
  (6, 'Junior', 'junior', 3, 'Cấp độ Junior'),
  (7, '1 year', '1-year', 3, 'Kinh nghiệm 1 năm'),
  (8, 'TP. Ho Chi Minh', 'ho-chi-minh-city', 4, 'Địa điểm tại TP. HCM'),
  (9, 'English', 'english', 2, 'Tiếng Anh'),
  (10, 'Bachelor', 'bachelor', 2, 'Trình độ đại học'),
  (11, 'UI/UX', 'ui-ux', 1, 'Thiết kế trải nghiệm người dùng'),
  (12, 'Data', 'data', 1, 'Phân tích dữ liệu'),
  (13, 'QA', 'qa', 1, 'Kiểm thử phần mềm'),
  (14, 'Sales', 'sales', 1, 'Kinh doanh và bán hàng'),
  (15, 'Product', 'product', 1, 'Quản lý sản phẩm'),
  (16, 'Node.js', 'nodejs', 2, 'Kỹ năng Node.js'),
  (17, 'Python', 'python', 2, 'Kỹ năng Python'),
  (18, 'HTML/CSS', 'html-css', 2, 'Kỹ năng giao diện web'),
  (19, 'Fresher', 'fresher', 3, 'Mức kinh nghiệm fresher'),
  (20, 'Remote', 'remote', 4, 'Làm việc từ xa'),
  (21, 'Full-time', 'full-time', 5, 'Công việc toàn thời gian'),
  (22, 'Part-time', 'part-time', 5, 'Công việc bán thời gian');

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
  (1, 1),
  (1, 3),
  (1, 4),
  (1, 6),
  (1, 8),
  (1, 21),
  (2, 2),
  (2, 3),
  (2, 5),
  (2, 7),
  (2, 8),
  (2, 20),
  (2, 21),
  (3, 11),
  (3, 1),
  (3, 18),
  (3, 8),
  (3, 21),
  (4, 13),
  (4, 3),
  (4, 20),
  (4, 6),
  (4, 21);

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
  (2, 7),
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





