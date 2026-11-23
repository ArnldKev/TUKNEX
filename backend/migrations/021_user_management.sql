-- Preserve the existing principal administrator while allowing delegated administrators.
ALTER TABLE usuarios ADD COLUMN is_owner boolean NOT NULL DEFAULT false;
UPDATE usuarios SET is_owner=true WHERE rol='admin';
DROP INDEX usuarios_un_administrador;
CREATE UNIQUE INDEX usuarios_un_propietario ON usuarios (is_owner) WHERE is_owner;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_propietario_admin CHECK (NOT is_owner OR rol='admin');
