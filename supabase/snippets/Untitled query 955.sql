select id, email, email_confirmed_at, last_sign_in_at, created_at
from auth.users
where email = 'nbao1390@gmail.com';
select provider, user_id, identity_data
from auth.identities
where user_id = '4ad847c1-d2a2-49d7-a5d8-f5b363db861b';