package f95

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

const loginURL = baseURL + "/login/login"

func (c *Client) Login(ctx context.Context, username, password string) error {
	// Step 1: GET login page to extract XenForo CSRF token.
	if err := c.limiter.Wait(ctx); err != nil {
		return fmt.Errorf("rate limiter: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, loginURL, nil)
	if err != nil {
		return err
	}
	setHeaders(req, loginURL)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("fetch login page: %w", err)
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return fmt.Errorf("parse login page: %w", err)
	}

	token, exists := doc.Find(`input[name="_xfToken"]`).Attr("value")
	if !exists || token == "" {
		return fmt.Errorf("CSRF token not found on login page")
	}

	// Step 2: POST credentials.
	if err := c.limiter.Wait(ctx); err != nil {
		return fmt.Errorf("rate limiter: %w", err)
	}

	form := url.Values{
		"login":               {username},
		"password":            {password},
		"_xfToken":            {token},
		"remember":            {"1"},
		"_xfRedirect":         {baseURL + "/"},
		"password_confirm":    {""},
		"additional_security": {""},
		"website_code":        {""},
		"url":                 {""},
	}

	postReq, err := http.NewRequestWithContext(ctx, http.MethodPost, loginURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	setHeaders(postReq, loginURL)
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	postResp, err := c.http.Do(postReq)
	if err != nil {
		return fmt.Errorf("post login: %w", err)
	}
	defer postResp.Body.Close()
	io.Copy(io.Discard, postResp.Body)

	// XenForo sets xf_user cookie on successful login.
	base, _ := url.Parse(baseURL)
	cookies := c.http.Jar.Cookies(base)
	log.Printf("[F95] Login cookies after POST: %d total", len(cookies))
	for _, cookie := range cookies {
		log.Printf("[F95]   cookie: %s = %s", cookie.Name, cookie.Value[:min(len(cookie.Value), 8)]+"…")
		if cookie.Name == "xf_user" && cookie.Value != "" {
			c.setLoggedIn(true)
			// Refresh the CSRF token now that the session is established.
			// The token from the login page GET is stale after the POST.
			_ = c.fetchXFToken(ctx)
			log.Printf("[F95] Login successful for session")
			return nil
		}
	}

	return fmt.Errorf("login failed: check credentials or 2FA may be required")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func setHeaders(req *http.Request, referer string) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}
}
