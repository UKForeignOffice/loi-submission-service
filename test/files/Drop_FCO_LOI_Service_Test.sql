--END;

--close any connections to the test database

select pg_terminate_backend(pid) from pg_stat_activity where datname='FCO-LOI-Service-Test';

DROP DATABASE IF EXISTS "FCO-LOI-Service-Test";