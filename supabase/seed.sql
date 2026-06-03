SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict gZrDDCtURHwYYGAWEX4ZIrdZJOKb7cuOraVbFjVK9XHVEMPLjw1O1hzPmEG1BKL

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'doctor@test.com', '$2a$06$0P4oo/gswECqeDfRnEiYj.GLC/bnBGQL3TRglJEIyKRLy5XfsyMBW', '2026-05-27 09:59:02.837345+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Test Doctor"}', NULL, '2026-05-27 09:59:02.837345+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'authenticated', 'authenticated', 'doctor3@test.com', '$2a$06$kDW1illQ.m1VpzfbRakNn.X9MaSs4pHITYe/YDztceDkLDWsAgNEK', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "BS. Phạm Đức Trí"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'patient@test.com', '$2a$06$a8Em3QCrTtx55IYZ4B9yGO1w9SGrp2W1UwDVsGN3yqLtZSDf8gNCG', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Test Patient"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'authenticated', 'authenticated', 'doctor2@test.com', '$2a$06$6dtFSSYiCW8K2iQfIMc0W.xZyn3.wXjkKZsf5q2toIOqTjkdL1bum', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "ThS. Nguyễn Hà My"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@test.com', '$2a$06$LBOLnrhdraeru/TU0mewzu9.YgHIrtzKjndQQnLL5wJL/E0kf7y1u', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Test Admin"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'authenticated', 'authenticated', 'doctor4@test.com', '$2a$06$QpijnqIKteUuRwBGmT/PUejSW28y7flbMD3oX2Y96/E8i0Xm6Iylq', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "BS. Võ Anh Thư"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'authenticated', 'authenticated', 'doctor5@test.com', '$2a$06$SZh/6ehpViH/2i8YTa4cmOSnU22QuZdUj28JmyYHFsfPcp33/XbBq', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "CNDD. Hoàng Ngọc Lan"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated', 'authenticated', 'doctor1@test.com', '$2a$06$iCsAFz8mUbpJMY9ftvYaIODDneID7GtAYeihzHSF5HWwM1YssuBwG', '2026-05-27 09:59:02.881857+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "BS. Lê Minh Khoa"}', NULL, '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false) ON CONFLICT DO NOTHING;


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '{"sub": "10000000-0000-4000-8000-000000000003", "email": "doctor@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000003'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "email": "doctor3@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
	('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"sub": "10000000-0000-4000-8000-000000000001", "email": "patient@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000001'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "email": "doctor2@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
	('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '{"sub": "10000000-0000-4000-8000-000000000002", "email": "admin@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "email": "doctor4@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", "email": "doctor5@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "email": "doctor1@test.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') ON CONFLICT DO NOTHING;


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."accounts" ("id", "email", "password_hash", "account_type", "must_change_password", "account_status", "created_at") VALUES
	('10000000-0000-4000-8000-000000000001', 'patient@test.com', NULL, 'patient', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('10000000-0000-4000-8000-000000000002', 'admin@test.com', NULL, 'admin', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'doctor1@test.com', NULL, 'doctor', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'doctor2@test.com', NULL, 'doctor', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'doctor3@test.com', NULL, 'doctor', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'doctor4@test.com', NULL, 'doctor', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'doctor5@test.com', NULL, 'doctor', false, 'active', '2026-05-27 09:59:02.881857+00'),
	('10000000-0000-4000-8000-000000000003', 'doctor@test.com', NULL, 'doctor', true, 'active', '2026-05-27 09:59:02.837345+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."doctors" ("full_name", "specialty", "avatar_url", "bio", "experience_years", "rating", "consultation_fee", "available_online", "created_at", "public_profile_status", "public_profile_submitted_at", "public_profile_reviewed_at", "public_profile_reviewed_by", "public_profile_rejection_reason", "deleted_at", "id") VALUES
	('Dr. Test', 'Physical Therapy', 'doctors/dr-test.jpg', 'Experienced therapist for test purposes', 5, 5.0, 500000.00, true, '2026-05-27 09:59:02.837345+00', 'submitted', '2026-05-27 09:59:02.837345+00', NULL, NULL, NULL, NULL, '10000000-0000-4000-8000-000000000003'),
	('BS. Lê Minh Khoa', 'Phục hồi chức năng', 'doctors/le-minh-khoa.jpg', 'Chuyên điều trị phục hồi sau đột quỵ và chấn thương.', 12, 4.9, 350000.00, true, '2026-05-27 09:59:02.881857+00', 'approved', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002', NULL, NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
	('ThS. Nguyễn Hà My', 'Vật lý trị liệu', 'doctors/nguyen-ha-my.jpg', 'Tập trung vào bài tập cá nhân hóa và phục hồi khả năng di chuyển.', 9, 4.8, 280000.00, true, '2026-05-27 09:59:02.881857+00', 'approved', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002', NULL, NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
	('BS. Phạm Đức Trí', 'Thần kinh', 'doctors/pham-duc-tri.jpg', 'Tư vấn theo dõi biến chứng thần kinh sau đột quỵ.', 15, 4.9, 450000.00, true, '2026-05-27 09:59:02.881857+00', 'approved', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002', NULL, NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
	('BS. Võ Anh Thư', 'Cơ xương khớp', 'doctors/vo-anh-thu.jpg', 'Hỗ trợ phục hồi sau chấn thương và đau mỏi vận động.', 10, 4.7, 320000.00, false, '2026-05-27 09:59:02.881857+00', 'rejected', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002', 'Seed sample rejected public profile.', NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
	('CNDD. Hoàng Ngọc Lan', 'Dinh dưỡng phục hồi', 'doctors/hoang-ngoc-lan.jpg', 'Tư vấn dinh dưỡng giúp người bệnh có nền tảng phục hồi tốt hơn.', 8, 4.8, 250000.00, true, '2026-05-27 09:59:02.881857+00', 'approved', '2026-05-27 09:59:02.881857+00', '2026-05-27 09:59:02.881857+00', '10000000-0000-4000-8000-000000000002', NULL, NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5') ON CONFLICT DO NOTHING;


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."patients" ("id", "full_name", "phone", "date_of_birth", "address", "medical_condition", "gender") VALUES
	('10000000-0000-4000-8000-000000000001', 'Test Patient', NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("id", "name", "description", "category", "price", "image_url", "stock_quantity", "is_recommended", "created_at") VALUES
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Bộ bóng mềm tập nắm tay', 'Dụng cụ tập lực nắm và vận động bàn tay cho người cần phục hồi sau đột quỵ.', 'Dụng cụ tập tay', 180000.00, 'products/hand-grip.jpg', 40, true, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Dây kéo kháng lực RehabAI', 'Dây kháng lực nhiều mức độ cho bài tập tay, vai và chân.', 'Dây kháng lực', 220000.00, 'products/resistance-band.jpg', 35, true, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'Khung tập đi gấp gọn', 'Hỗ trợ người bệnh tập đi an toàn trong quá trình tập luyện có giám sát.', 'Khung tập đi', 1250000.00, 'products/walker.jpg', 12, true, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'Bóng tập phục hồi 55cm', 'Bóng tập giúp cải thiện thăng bằng, sức mạnh thân mình và độ linh hoạt.', 'Bóng tập phục hồi', 360000.00, 'products/therapy-ball.jpg', 24, false, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', 'Bàn đạp tập chân tại nhà', 'Dụng cụ tập chân nhỏ gọn cho người cần cải thiện tầm vận động.', 'Dụng cụ tập chân', 690000.00, 'products/pedal-trainer.jpg', 18, true, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', 'Ghế tắm hỗ trợ an toàn', 'Ghế chống trượt hỗ trợ sinh hoạt hằng ngày cho người cao tuổi và người yếu vận động.', 'Ghế hỗ trợ', 780000.00, 'products/shower-chair.jpg', 14, false, '2026-05-27 09:59:02.881857+00'),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', 'Máy đo huyết áp điện tử', 'Thiết bị theo dõi sức khỏe tại nhà, phù hợp với người cần quan sát chỉ số định kỳ.', 'Thiết bị theo dõi sức khỏe', 950000.00, 'products/blood-pressure-monitor.jpg', 30, true, '2026-05-27 09:59:02.881857+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chatbot_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: doctor_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: doctor_schedule_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: exercises; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."exercises" ("id", "title", "slug", "description", "category", "difficulty", "body_region", "duration_minutes", "repetitions", "sets", "instructions", "precautions", "image_url", "video_url", "is_active", "created_at") VALUES
	('f1111111-1111-4111-8111-111111111111', 'Nâng tay thụ động', 'nang-tay-thu-dong', 'Bài tập nhẹ giúp duy trì tầm vận động vai và cánh tay sau đột quỵ.', 'Phục hồi sau đột quỵ', 'Cơ bản', 'Cánh tay', 8, 10, 2, '{"Ngồi thẳng lưng trên ghế chắc chắn.","Dùng tay lành nâng nhẹ tay yếu lên phía trước.","Giữ 2 giây rồi hạ chậm về vị trí ban đầu."}', '{"Không kéo quá tầm vận động gây đau.","Nên có người nhà hỗ trợ nếu khả năng giữ thăng bằng kém."}', 'exercises/passive-arm-raise.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111112', 'Nắm mở bàn tay', 'nam-mo-ban-tay', 'Cải thiện khả năng chủ động của ngón tay và bàn tay.', 'Chi trên', 'Cơ bản', 'Bàn tay', 6, 12, 3, '{"Đặt cẳng tay lên bàn.","Nắm bàn tay chậm rãi.","Mở từng ngón tay hết mức có thể."}', '{"Dừng lại nếu có co thắt hoặc đau tăng nhanh."}', 'exercises/hand-open-close.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111113', 'Duỗi cổ tay', 'duoi-co-tay', 'Kéo giãn nhẹ nhóm cơ gấp cổ tay, phù hợp với người bị cứng cơ.', 'Linh hoạt', 'Cơ bản', 'Bàn tay', 5, 8, 2, '{"Đưa cánh tay ra trước.","Dùng tay còn lại kéo nhẹ bàn tay về phía sau.","Giữ 10 giây và thở đều."}', '{"Không giật mạnh cổ tay.","Nếu tê lan xuống ngón tay, dừng tập."}', 'exercises/wrist-stretch.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111114', 'Nâng chân khi ngồi', 'nang-chan-khi-ngoi', 'Tăng sức mạnh đùi trước và khả năng kiểm soát chân khi ngồi.', 'Chi dưới', 'Cơ bản', 'Chân', 8, 10, 2, '{"Ngồi trên ghế, hai chân chạm sàn.","Duỗi một chân về phía trước đến khi gối gần thẳng.","Hạ chân chậm và đổi bên."}', '{"Giữ lưng thẳng, không ngả người ra sau."}', 'exercises/seated-leg-raise.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111115', 'Tập đứng lên ngồi xuống', 'tap-dung-len-ngoi-xuong', 'Hỗ trợ khả năng độc lập trong sinh hoạt hằng ngày.', 'Sức mạnh', 'Trung cấp', 'Chân', 10, 8, 3, '{"Ngồi sát mép ghế chắc chắn.","Đặt hai chân rộng bằng vai.","Đẩy người đứng lên rồi ngồi xuống chậm rãi."}', '{"Cần có tay vịn hoặc người hỗ trợ nếu thăng bằng chưa tốt."}', 'exercises/sit-to-stand.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111116', 'Tập giữ thăng bằng', 'tap-giu-thang-bang', 'Rèn luyện thăng bằng tĩnh để giảm nguy cơ té ngã.', 'Tập thăng bằng', 'Cơ bản', 'Toàn thân', 7, 5, 2, '{"Đứng gần mặt bàn hoặc tay vịn.","Giữ hai chân rộng bằng hông.","Giữ tư thế 20-30 giây và thở đều."}', '{"Luôn tập gần điểm bám chắc chắn.","Dừng ngay nếu chóng mặt."}', 'exercises/balance-training.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111117', 'Bước ngang có hỗ trợ', 'buoc-ngang-co-ho-tro', 'Cải thiện khả năng di chuyển ngang và kiểm soát hông.', 'Vận động', 'Trung cấp', 'Hông', 10, 10, 2, '{"Đứng cạnh tay vịn.","Bước một chân sang ngang.","Kéo chân còn lại về gần và lặp lại."}', '{"Không tập khi sàn trơn.","Cần người giám sát nếu từng té ngã gần đây."}', 'exercises/supported-side-step.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111118', 'Kéo giãn vai', 'keo-gian-vai', 'Giảm căng cứng vùng vai và cải thiện tầm vận động.', 'Linh hoạt', 'Cơ bản', 'Vai', 6, 8, 2, '{"Đưa tay ngang ngực.","Dùng tay còn lại kéo nhẹ cánh tay về phía thân mình.","Giữ 10 giây mỗi lần."}', '{"Không ép vai nếu có đau nhói."}', 'exercises/shoulder-stretch.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111119', 'Gập duỗi gối', 'gap-duoi-goi', 'Hỗ trợ tầm vận động khớp gối sau chấn thương hoặc phẫu thuật.', 'Phục hồi chấn thương', 'Cơ bản', 'Gối', 8, 10, 2, '{"Ngồi hoặc nằm với chân duỗi thoải mái.","Gập gối chậm rãi trong mức không đau.","Duỗi chân về vị trí ban đầu."}', '{"Tuân thủ giới hạn vận động nếu mới phẫu thuật."}', 'exercises/knee-flexion-extension.jpg', NULL, true, '2026-05-27 09:59:02.696807+00'),
	('f1111111-1111-4111-8111-111111111120', 'Tập phối hợp tay mắt', 'tap-phoi-hop-tay-mat', 'Rèn khả năng điều khiển động tác và phối hợp sau đột quỵ.', 'Phối hợp động tác', 'Trung cấp', 'Cánh tay', 10, 12, 3, '{"Đặt các vật nhỏ trên bàn.","Chạm lần lượt từng vật bằng ngón trỏ.","Tăng tốc độ khi kiểm soát tốt hơn."}', '{"Bắt đầu chậm, ưu tiên chính xác hơn tốc độ."}', 'exercises/hand-eye-coordination.jpg', NULL, true, '2026-05-27 09:59:02.696807+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: recovery_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: exercise_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: recovery_plan_exercises; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."subscriptions" ("id", "name", "price", "description", "features", "created_at") VALUES
	('cccccccc-cccc-4ccc-8ccc-ccccccccccc0', 'Free', 0.00, 'Gói mặc định cho tài khoản đã đăng nhập nhưng chưa mua gói dịch vụ.', '["Truy cập Dashboard", "Xem danh sách bác sĩ", "Đặt lịch hẹn", "Mua sản phẩm", "Xem bảng giá"]', '2026-05-27 09:59:02.707655+00'),
	('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Basic', 99000.00, 'Hỗ trợ cơ bản để bắt đầu hành trình phục hồi có định hướng.', '["Truy cập thư viện bài tập cơ bản", "Chatbot AI hỗ trợ thông tin dịch vụ", "Đặt lịch tư vấn online"]', '2026-05-27 09:59:02.696807+00'),
	('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Standard', 249000.00, 'Phù hợp khi cần lộ trình tập luyện và theo dõi tiến trình.', '["Tất cả tính năng Basic", "Tạo lộ trình tập luyện cá nhân hóa", "Theo dõi tiến trình phục hồi", "Gợi ý bài tập theo mục tiêu"]', '2026-05-27 09:59:02.696807+00'),
	('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Premium', 599000.00, 'Đồng hành sâu hơn với tư vấn ưu tiên và báo cáo tiến trình nâng cao.', '["Tất cả tính năng Standard", "Ưu tiên tư vấn với chuyên gia", "Báo cáo tiến trình nâng cao", "Gợi ý điều chỉnh lộ trình định kỳ"]', '2026-05-27 09:59:02.696807+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict gZrDDCtURHwYYGAWEX4ZIrdZJOKb7cuOraVbFjVK9XHVEMPLjw1O1hzPmEG1BKL

RESET ALL;


-- Create public assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
