-- Rode no SQL Editor do Neon, branch `production`, como DONO (neondb_owner). Só para o SPK-0001.
CREATE TABLE IF NOT EXISTS spike_s01 (
  id bigserial PRIMARY KEY,
  marcador text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON spike_s01 TO pelada_app;
GRANT USAGE ON SEQUENCE spike_s01_id_seq TO pelada_app;
