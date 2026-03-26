package main

import (
	"log"
	"net/http"
	"os"

	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/handlers"
	"travel-tracker-api/internal/middleware"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Conectar a la base de datos
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Crear router
	r := mux.NewRouter()

	// Configurar CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// API routes
	api := r.PathPrefix("/api").Subrouter()

	// Auth routes (públicas)
	api.HandleFunc("/auth/register", handlers.Register).Methods("POST")
	api.HandleFunc("/auth/login", handlers.Login).Methods("POST")
	api.HandleFunc("/auth/logout", handlers.Logout).Methods("POST")

	// Auth routes (protegidas)
	apiAuth := api.PathPrefix("").Subrouter()
	apiAuth.Use(middleware.AuthMiddleware)
	apiAuth.HandleFunc("/auth/validate", handlers.ValidateSession).Methods("GET")

	// Trip routes (protegidas)
	apiAuth.HandleFunc("/trips", handlers.GetAllTrips).Methods("GET")
	apiAuth.HandleFunc("/trips", handlers.CreateTrip).Methods("POST")
	apiAuth.HandleFunc("/trips/{id}", handlers.GetTripByID).Methods("GET")
	apiAuth.HandleFunc("/trips/{id}", handlers.UpdateTrip).Methods("PUT")
	apiAuth.HandleFunc("/trips/{id}", handlers.DeleteTrip).Methods("DELETE")

	// Place routes (protegidas)
	apiAuth.HandleFunc("/places", handlers.GetAllPlaces).Methods("GET")
	apiAuth.HandleFunc("/places", handlers.CreatePlace).Methods("POST")
	apiAuth.HandleFunc("/places/{id}", handlers.GetPlaceByID).Methods("GET")
	apiAuth.HandleFunc("/places/{id}", handlers.UpdatePlace).Methods("PUT")
	apiAuth.HandleFunc("/places/{id}", handlers.DeletePlace).Methods("DELETE")

	// Health check
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	// Aplicar middlewares
	handler := middleware.Logger(c.Handler(r))

	// Obtener puerto
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	// Iniciar servidor
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📊 API available at http://localhost:%s/api", port)
	log.Printf("💚 Health check at http://localhost:%s/health", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
