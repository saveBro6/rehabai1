alter function public.is_active_doctor_account(uuid)
set search_path = '';

alter function public.submit_doctor_public_profile(uuid)
set search_path = '';

alter function public.review_doctor_public_profile(uuid, text, text)
set search_path = '';

alter function public.handle_new_auth_user()
set search_path = '';
