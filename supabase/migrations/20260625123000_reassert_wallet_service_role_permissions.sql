grant select on table public.wallets to service_role;
grant select, insert, update on table public.wallet_topups to service_role;
grant select, insert, update on table public.wallet_transactions to service_role;

comment on table public.wallets is
  'Wallet records. service_role has controlled server-side access for wallet top-up API routes and provider webhook processing.';

comment on table public.wallet_topups is
  'Wallet top-up requests. Browser reads are SELECT-only for authenticated users through RLS; service_role has controlled server-side access for payOS top-up creation and provider processing.';

comment on table public.wallet_transactions is
  'Wallet ledger transactions. Browser reads are SELECT-only for authenticated users through RLS; service_role has controlled server-side access for wallet ledger operations.';
