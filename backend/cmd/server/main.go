package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"avn-tracker/backend/internal/database"
	"avn-tracker/backend/internal/f95"
	"avn-tracker/backend/internal/graph"
	"avn-tracker/backend/internal/graph/generated"
	"avn-tracker/backend/internal/repository"
	"avn-tracker/backend/internal/syncer"
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
		"/app/migrations/003_recommendation_links.up.sql",
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
	gameRepo := repository.NewGameRepo(pool)
	linkRepo := repository.NewLinkRepo(pool)
	f95Client := f95.NewClient()

	// Restore F95 session from stored credentials if available.
	if username, password, err := settingsRepo.GetF95Credentials(ctx); err == nil && username != "" && password != "" {
		if loginErr := f95Client.Login(ctx, username, password); loginErr != nil {
			log.Printf("F95Zone auto-login failed: %v", loginErr)
		} else {
			log.Println("F95Zone session restored")
		}
	}

	appSyncer := syncer.New(gameRepo, f95Client)

	// Startup sweep: wait for login to settle, then check all F95 games for updates.
	go func() {
		time.Sleep(15 * time.Second)
		log.Println("[Sync] Running startup F95 version sweep")
		r := appSyncer.SyncAll(context.Background())
		log.Printf("[Sync] Startup sweep: %d/%d updated, %d errors", r.Updated, r.Total, len(r.Errors))
	}()

	// Weekly cron: re-check all F95 games every 7 days.
	go func() {
		ticker := time.NewTicker(7 * 24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			log.Println("[Sync] Running weekly F95 version sweep")
			r := appSyncer.SyncAll(context.Background())
			log.Printf("[Sync] Weekly sweep: %d/%d updated, %d errors", r.Updated, r.Total, len(r.Errors))
		}
	}()

	resolver := &graph.Resolver{
		Repo:     gameRepo,
		Settings: settingsRepo,
		Links:    linkRepo,
		VNDB:     vndb.NewClient(),
		F95:      f95Client,
		Syncer:   appSyncer,
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
