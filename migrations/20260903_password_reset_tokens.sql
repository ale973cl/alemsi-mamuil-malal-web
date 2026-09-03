CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL REFERENCES usuarios(username) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_at TIMESTAMPTZ NOT NULL,
  usado_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario_activo ON password_reset_tokens(username,expira_at) WHERE usado_at IS NULL;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
