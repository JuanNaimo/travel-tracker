package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"travel-tracker-api/internal/auth"
	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/handlers"
	"travel-tracker-api/internal/middleware"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

const (
	// Las fotos viajan como data URL en base64 (imagen de hasta 5 MB ≈ 6,7 MB)
	maxPhotoBodySize   = 8 << 20
	maxDefaultBodySize = 1 << 20

	uuidPattern = "{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}"
)

func main() {
	if err := auth.Init(); err != nil {
		log.Fatalf("Invalid auth configuration: %v", err)
	}

	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	r := newRouter()

	c := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins(),
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	handler := middleware.Logger(c.Handler(r))

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📊 API available at http://localhost:%s/api", port)
	log.Printf("💚 Health check at http://localhost:%s/health", port)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func newRouter() *mux.Router {
	r := mux.NewRouter()
	r.NotFoundHandler = jsonError(http.StatusNotFound, "Not found")
	r.MethodNotAllowedHandler = jsonError(http.StatusMethodNotAllowed, "Method not allowed")

	api := r.PathPrefix("/api").Subrouter()

	public := api.NewRoute().Subrouter()
	public.Use(middleware.MaxBodySize(maxDefaultBodySize))
	public.HandleFunc("/auth/register", handlers.Register).Methods("POST")
	public.HandleFunc("/auth/login", handlers.Login).Methods("POST")
	public.HandleFunc("/auth/mfa/verify", handlers.VerifyMFA).Methods("POST")
	public.HandleFunc("/auth/refresh", handlers.Refresh).Methods("POST")
	public.HandleFunc("/auth/logout", handlers.Logout).Methods("POST")

	protected := api.NewRoute().Subrouter()
	protected.Use(middleware.AuthMiddleware)

	photoUploads := protected.NewRoute().Subrouter()
	photoUploads.Use(middleware.MaxBodySize(maxPhotoBodySize))
	photoUploads.HandleFunc("/places/"+uuidPattern+"/photos", handlers.CreatePlacePhoto).Methods("POST")

	apiAuth := protected.NewRoute().Subrouter()
	apiAuth.Use(middleware.MaxBodySize(maxDefaultBodySize))

	apiAuth.HandleFunc("/auth/me", handlers.Me).Methods("GET")
	apiAuth.HandleFunc("/auth/mfa/setup", handlers.SetupMFA).Methods("POST")
	apiAuth.HandleFunc("/auth/mfa/enable", handlers.EnableMFA).Methods("POST")
	apiAuth.HandleFunc("/auth/mfa/disable", handlers.DisableMFA).Methods("POST")

	apiAuth.HandleFunc("/trips", handlers.GetAllTrips).Methods("GET")
	apiAuth.HandleFunc("/trips", handlers.CreateTrip).Methods("POST")
	apiAuth.HandleFunc("/trips/"+uuidPattern, handlers.GetTripByID).Methods("GET")
	apiAuth.HandleFunc("/trips/"+uuidPattern, handlers.UpdateTrip).Methods("PUT")
	apiAuth.HandleFunc("/trips/"+uuidPattern, handlers.DeleteTrip).Methods("DELETE")
	apiAuth.HandleFunc("/trips/"+uuidPattern+"/photos", handlers.GetTripPhotos).Methods("GET")

	apiAuth.HandleFunc("/places", handlers.GetAllPlaces).Methods("GET")
	apiAuth.HandleFunc("/places", handlers.CreatePlace).Methods("POST")
	apiAuth.HandleFunc("/places/"+uuidPattern, handlers.GetPlaceByID).Methods("GET")
	apiAuth.HandleFunc("/places/"+uuidPattern, handlers.UpdatePlace).Methods("PUT")
	apiAuth.HandleFunc("/places/"+uuidPattern, handlers.DeletePlace).Methods("DELETE")
	apiAuth.HandleFunc("/places/"+uuidPattern+"/photos", handlers.GetPlacePhotos).Methods("GET")

	apiAuth.HandleFunc("/photos", handlers.GetAllPhotos).Methods("GET")
	apiAuth.HandleFunc("/photos/"+uuidPattern, handlers.DeletePhoto).Methods("DELETE")

	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	return r
}

func jsonError(status int, message string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write([]byte(`{"error":"` + message + `"}`))
	})
}

func allowedOrigins() []string {
	value := os.Getenv("CORS_ALLOWED_ORIGINS")
	if value == "" {
		return []string{"http://localhost:3000"}
	}
	var origins []string
	for _, o := range strings.Split(value, ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}
