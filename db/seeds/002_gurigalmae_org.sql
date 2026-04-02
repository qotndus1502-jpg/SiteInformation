-- Seed: 구리갈매역세권 A-1BL (site_id = 78) 조직도
-- PDF 기준 32명

-- 부서 생성
INSERT INTO pmis.site_department (site_id, name, sort_order) VALUES
  (78, '공무',        10),
  (78, '공사(1공구)',  20),
  (78, '공사(2공구)',  30),
  (78, '기계/토목',    40),
  (78, '품질',        50),
  (78, '안전',        60);

-- org_role id 참조:
-- 1=현장대리인, 2=현장소장, 3=팀장, 4=품질관리자, 5=안전관리자, 6=매니저, 7=팀원

-- ============================================================
-- 최상위: 현장대리인 + 현장소장 (parent_id = NULL)
-- ============================================================
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order)
VALUES (78, '주재규', '상무', '010-8007-7438', 'OWN', 1, NULL, 1);
-- id = 이후 CURRVAL 참조 대신, 순차 insert

INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order)
VALUES (78, '정현석', '부장', '010-2438-2788', 'OWN', 2, NULL, 2);

-- ============================================================
-- 공무 부서 (department = 공무)
-- ============================================================
-- 공무 팀장: 황영일
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '황영일', '부장', '010-6590-7664', 'OWN', 3,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공무'), 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 공무 팀원: 이정구
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '이정구', '차장', '010-3539-8532', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공무'), 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='황영일');

-- 공무 팀원: 김소미
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '김소미', '대리', '010-2671-7830', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공무'), 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='황영일');

-- ============================================================
-- 공사(1공구) 부서
-- ============================================================
-- 1공구 팀장: 장우진
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '장우진', '부장', '010-8514-0523', 'OWN', 3,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 신인호 (한신공영 - JV)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, company_name, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '신인호', '차장', '010-6421-9864', 'JV', '한신공영', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- 김형준
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '김형준', '주임', '010-3937-6501', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- 백준호
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '백준호', '사원', '010-3849-5752', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 40,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- 한진
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '한진', '사원', '010-2311-7918', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 50,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- 이승혁
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '이승혁', '사원', '010-4943-6765', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), '건축', 60,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- ============================================================
-- 공사(2공구) 부서
-- ============================================================
-- 2공구 팀장: 신유식
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '신유식', '차장', '010-3207-6715', 'OWN', 3,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 김성식
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '김성식', '과장', '010-6356-6553', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');

-- 노치혁
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '노치혁', '주임', '010-6354-7304', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');

-- 민준기
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '민준기', '주임', '010-4488-0875', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 40,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');

-- 나재엽
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '나재엽', '사원', '010-3849-5752', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 50,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');

-- ============================================================
-- 기계/토목 부서
-- ============================================================
-- 이종우 (기계)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '이종우', '부장', '010-6291-4458', 'OWN', 3,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='기계/토목'), '기계', 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 강동민 (기계)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '강동민', '부장', '010-8779-1859', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='기계/토목'), '기계', 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='이종우');

-- 정한성 (토목)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '정한성', '차장', '010-9357-2713', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='기계/토목'), '토목', 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='이종우');

-- ============================================================
-- 품질 부서
-- ============================================================
-- 품질관리자: 윤광민 (HJ중공업 - JV)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, company_name, role_id, department_id, sort_order, parent_id)
SELECT 78, '윤광민', '부장', '010-6381-6681', 'JV', 'HJ중공업', 4,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='품질'), 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 조성우
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '조성우', '부장', '010-4377-5015', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='품질'), 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='윤광민');

-- 김진태
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '김진태', '주임', '010-4660-6191', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='품질'), 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='윤광민');

-- ============================================================
-- 안전 부서
-- ============================================================
-- 안전관리자: 강덕현
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '강덕현', '부장', '010-5447-1668', 'OWN', 5,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), 10,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='정현석');

-- 선종옥
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '선종옥', '부장', '010-6471-8279', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), 20,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='강덕현');

-- 주태영
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '주태영', '과장', '010-4652-3641', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), 30,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='강덕현');

-- 이시현
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '이시현', '사원', '010-2043-7282', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), 40,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='강덕현');

-- 권용준
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '권용준', '사원', '010-5374-8284', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), 50,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='강덕현');

-- 박승민 (보건)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '박승민', '사원', '010-2381-4353', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='안전'), '보건', 60,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='강덕현');

-- ============================================================
-- 매니저 (부서 없음, 현장소장 직속)
-- ============================================================
-- 한계희 (1공구 매니저)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '한계희', '매니저', '010-6318-0764', 'OWN', 6,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(1공구)'), 70,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='장우진');

-- 진민경 (2공구/기계토목 매니저)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, sort_order, parent_id)
SELECT 78, '진민경', '매니저', '010-2719-9257', 'OWN', 6,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), 60,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');

-- 이찬일 (2공구)
INSERT INTO pmis.site_org_member (site_id, name, rank, phone, org_type, role_id, department_id, specialty, sort_order, parent_id)
SELECT 78, '이찬일', '주임', '010-3678-0641', 'OWN', 7,
  (SELECT id FROM pmis.site_department WHERE site_id=78 AND name='공사(2공구)'), '건축', 55,
  (SELECT id FROM pmis.site_org_member WHERE site_id=78 AND name='신유식');
