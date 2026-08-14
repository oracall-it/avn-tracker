package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"avn-tracker/backend/internal/database"
	"avn-tracker/backend/internal/f95"
	"avn-tracker/backend/internal/graph"
	"avn-tracker/backend/internal/graph/generated"
	"avn-tracker/backend/internal/repository"
	"avn-tracker/backend/internal/vndb"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/rs/cors"
)

func main() {
	ctx := context.Background()

	pool, err := database.NewPool(ctx)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	for _, migrationPath := range []string{
		"/app/migrations/001_init.up.sql",
		"/app/migrations/002_f95.up.sql",
	} {
		migration, err := os.ReadFile(migrationPath)
		if err != nil {
			log.Fatalf("read migration %s: %v", migrationPath, err)
		}
		if err := database.RunMigration(ctx, pool, string(migration)); err != nil {
			log.Fatalf("run migration %s: %v", migrationPath, err)
		}
	}

	settingsRepo := repository.NewSettingsRepo(pool)
	f95Client := f95.NewClient()

	// Restore F95 session from stored credentials if available.
	if username, password, err := settingsRepo.GetF95Credentials(ctx); err == nil && username != "" && password != "" {
		if loginErr := f95Client.Login(ctx, username, password); loginErr != nil {
			log.Printf("F95Zone auto-login failed: %v", loginErr)
		} else {
			log.Println("F95Zone session restored")
		}
	}

	resolver := &graph.Resolver{
		Repo:     repository.NewGameRepo(pool),
		Settings: settingsRepo,
		VNDB:     vndb.NewClient(),
		F95:      f95Client,
	}

	srv := handler.New(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.GET{})
	srv.Use(extension.Introspection{})

	mux := http.NewServeMux()
	mux.Handle("/graphql", srv)
	mux.Handle("/", playground.Handler("AVN Tracker", "/graphql"))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("GraphQL API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, c.Handler(mux)); err != nil {
		log.Fatal(err)
	}
}
