revoke execute on function public.is_active_doctor_account(uuid) from public;
revoke execute on function public.submit_doctor_public_profile(uuid) from public;
revoke execute on function public.review_doctor_public_profile(uuid, text, text) from public;
revoke execute on function public.handle_new_auth_user() from public;

revoke execute on function public.is_active_doctor_account(uuid) from anon;
revoke execute on function public.submit_doctor_public_profile(uuid) from anon;
revoke execute on function public.review_doctor_public_profile(uuid, text, text) from anon;
revoke execute on function public.handle_new_auth_user() from anon;

grant execute on function public.is_active_doctor_account(uuid) to authenticated;
grant execute on function public.submit_doctor_public_profile(uuid) to authenticated;
grant execute on function public.review_doctor_public_profile(uuid, text, text) to authenticated;

revoke execute on function public.handle_new_auth_user() from authenticated;
