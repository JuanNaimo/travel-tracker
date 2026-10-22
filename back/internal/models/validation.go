package models

import (
	"errors"
	"regexp"
	"strings"
	"time"
)

var PlaceCategories = map[string]bool{
	"restaurante": true,
	"hotel":       true,
	"atraccion":   true,
	"museo":       true,
	"naturaleza":  true,
	"compras":     true,
	"otros":       true,
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func IsUUID(s string) bool {
	return uuidPattern.MatchString(s)
}

const (
	MaxNameLength    = 255
	MaxCaptionLength = 200
)

func validateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("name is required")
	}
	if len(name) > MaxNameLength {
		return errors.New("name is too long")
	}
	return nil
}

func validateRating(rating *int) error {
	if rating != nil && (*rating < 1 || *rating > 5) {
		return errors.New("rating must be between 1 and 5")
	}
	return nil
}

func validateDate(date *string, field string) error {
	if date == nil || *date == "" {
		return nil
	}
	if _, err := time.Parse("2006-01-02", *date); err != nil {
		return errors.New(field + " must be a date in YYYY-MM-DD format")
	}
	return nil
}

func validateLatitude(lat float64) error {
	if lat < -90 || lat > 90 {
		return errors.New("latitude must be between -90 and 90")
	}
	return nil
}

func validateLongitude(lng float64) error {
	if lng < -180 || lng > 180 {
		return errors.New("longitude must be between -180 and 180")
	}
	return nil
}

func validateExpenses(expenses float64) error {
	if expenses < 0 {
		return errors.New("expenses must be a non-negative number")
	}
	return nil
}

func validateCategory(category string) error {
	if !PlaceCategories[category] {
		return errors.New("invalid category")
	}
	return nil
}

func (t *Trip) Validate() error {
	return firstError(
		validateName(t.Name),
		validateRating(t.Rating),
		validateDate(t.StartDate, "start_date"),
		validateDate(t.EndDate, "end_date"),
	)
}

func (u *TripUpdate) Validate() error {
	var nameErr error
	if u.Name != nil {
		nameErr = validateName(*u.Name)
	}
	return firstError(
		nameErr,
		validateRating(u.Rating),
		validateDate(u.StartDate, "start_date"),
		validateDate(u.EndDate, "end_date"),
	)
}

func (p *Place) Validate() error {
	if !IsUUID(p.TripID) {
		return errors.New("trip_id must be a valid UUID")
	}
	return firstError(
		validateName(p.Name),
		validateCategory(p.Category),
		validateLatitude(p.Latitude),
		validateLongitude(p.Longitude),
		validateRating(p.Rating),
		validateDate(p.VisitDate, "visit_date"),
		validateExpenses(p.Expenses),
	)
}

func (u *PlaceUpdate) Validate() error {
	var errs []error
	if u.Name != nil {
		errs = append(errs, validateName(*u.Name))
	}
	if u.Category != nil {
		errs = append(errs, validateCategory(*u.Category))
	}
	if u.Latitude != nil {
		errs = append(errs, validateLatitude(*u.Latitude))
	}
	if u.Longitude != nil {
		errs = append(errs, validateLongitude(*u.Longitude))
	}
	if u.Expenses != nil {
		errs = append(errs, validateExpenses(*u.Expenses))
	}
	errs = append(errs, validateRating(u.Rating), validateDate(u.VisitDate, "visit_date"))
	return firstError(errs...)
}

var allowedPhotoPrefixes = []string{
	"data:image/jpeg;base64,",
	"data:image/png;base64,",
	"data:image/webp;base64,",
	"data:image/gif;base64,",
	"https://",
}

func (r *CreatePhotoRequest) Validate() error {
	valid := false
	for _, prefix := range allowedPhotoPrefixes {
		if strings.HasPrefix(r.PhotoURL, prefix) && len(r.PhotoURL) > len(prefix) {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("photo_url must be a base64 image data URL (jpeg, png, webp, gif) or an https URL")
	}
	if r.Caption != nil && len([]rune(*r.Caption)) > MaxCaptionLength {
		return errors.New("caption is too long")
	}
	return nil
}

func firstError(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}
