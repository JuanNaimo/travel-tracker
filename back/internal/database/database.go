package database

import (
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect() error {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "travel_user")
	password := getEnv("DB_PASSWORD", "")
	dbname := getEnv("DB_NAME", "travel_tracker")
	sslmode := getEnv("DB_SSLMODE", "disable")

	// Se arma como URL para que valores vacíos o con espacios no rompan el parseo
	connURL := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, password),
		Host:     net.JoinHostPort(host, port),
		Path:     dbname,
		RawQuery: url.Values{"sslmode": {sslmode}}.Encode(),
	}
	connStr := connURL.String()

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println("✓ Database connected successfully")
	return nil
}

func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// set_config(..., true) equivale a SET LOCAL pero admite parámetros
func SetUserContext(tx *sql.Tx, userID string) error {
	_, err := tx.Exec("SELECT set_config('app.current_user_id', $1, true)", userID)
	return err
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
