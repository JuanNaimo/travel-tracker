-- Funciones auxiliares para autenticación local

-- Función para crear un nuevo usuario
CREATE OR REPLACE FUNCTION create_user(
    p_email VARCHAR,
    p_encrypted_password VARCHAR,
    p_user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (
        email,
        encrypted_password,
        user_metadata
    ) VALUES (
        p_email,
        p_encrypted_password,
        p_user_metadata
    )
    RETURNING id INTO new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuario por email
CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    encrypted_password VARCHAR,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    user_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    banned_until TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.encrypted_password,
        u.last_sign_in_at,
        u.user_metadata,
        u.created_at,
        u.banned_until
    FROM users u
    WHERE u.email = p_email
    AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear una sesión
CREATE OR REPLACE FUNCTION create_session(
    p_user_id UUID,
    p_token VARCHAR,
    p_refresh_token VARCHAR,
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
    new_session_id UUID;
BEGIN
    -- Actualizar last_sign_in_at del usuario
    UPDATE users
    SET last_sign_in_at = NOW()
    WHERE id = p_user_id;

    -- Crear la sesión
    INSERT INTO sessions (
        user_id,
        token,
        refresh_token,
        expires_at
    ) VALUES (
        p_user_id,
        p_token,
        p_refresh_token,
        p_expires_at
    )
    RETURNING id INTO new_session_id;

    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar una sesión
CREATE OR REPLACE FUNCTION validate_session(p_token VARCHAR)
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    email VARCHAR,
    user_metadata JSONB,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.user_id,
        u.email,
        u.user_metadata,
        (s.expires_at > NOW() AND u.banned_until IS NULL AND u.deleted_at IS NULL) as is_valid
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para invalidar una sesión (logout)
CREATE OR REPLACE FUNCTION delete_session(p_token VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE token = p_token;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear refresh token
CREATE OR REPLACE FUNCTION create_refresh_token(
    p_token VARCHAR,
    p_user_id UUID,
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_parent VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_token_id UUID;
BEGIN
    INSERT INTO refresh_tokens (
        token,
        user_id,
        expires_at,
        parent
    ) VALUES (
        p_token,
        p_user_id,
        p_expires_at,
        p_parent
    )
    RETURNING id INTO new_token_id;

    RETURN new_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar y usar un refresh token
CREATE OR REPLACE FUNCTION use_refresh_token(p_token VARCHAR)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.user_id,
        u.email,
        (rt.expires_at > NOW() AND NOT rt.revoked AND u.deleted_at IS NULL) as is_valid
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token = p_token;

    -- Marcar el token como usado (opcional, según tu estrategia)
    -- UPDATE refresh_tokens SET revoked = TRUE WHERE token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar el password de un usuario
CREATE OR REPLACE FUNCTION update_password(
    p_user_id UUID,
    p_encrypted_password VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users
    SET encrypted_password = p_encrypted_password,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
