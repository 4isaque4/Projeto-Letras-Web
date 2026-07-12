-- Garante que a API de backend, autenticada com a chave service_role,
-- consiga operar sobre objetos criados pelas migrations do projeto.
-- O service_role continua restrito ao backend e ignora RLS por design.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;

alter default privileges for role postgres in schema public
  grant all privileges on sequences to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
