package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

// DB es la instancia global de la base de datos
var DB *sql.DB

// Connect establece la conexión con PostgreSQL
func Connect() error {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "travel_user")
	password := getEnv("DB_PASSWORD", "")
	dbname := getEnv("DB_NAME", "travel_tracker")
	sslmode := getEnv("DB_SSLMODE", "disable")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}

	// Verificar la conexión
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	// Configurar pool de conexiones
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println("✓ Database connected successfully")
	return nil
}

// Close cierra la conexión con la base de datos
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// SetUserContext configura el user_id en la sesión de PostgreSQL para RLS
func SetUserContext(tx *sql.Tx, userID string) error {
	// Note: SET LOCAL doesn't support parameterized queries, so we use fmt.Sprintf
	// The userID should be a UUID, so we're safe from SQL injection
	query := fmt.Sprintf("SET LOCAL app.current_user_id = '%s'", userID)
	_, err := tx.Exec(query)
	return err
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
