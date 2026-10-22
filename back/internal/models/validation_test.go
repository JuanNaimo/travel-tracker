package models

import (
	"strings"
	"testing"
)

func ptr[T any](v T) *T { return &v }

func validPlace() Place {
	return Place{
		TripID:    "123e4567-e89b-12d3-a456-426614174000",
		Name:      "Torre Eiffel",
		Category:  "atraccion",
		Latitude:  48.8584,
		Longitude: 2.2945,
	}
}

func TestPlaceValidate(t *testing.T) {
	cases := map[string]struct {
		mutate  func(*Place)
		wantErr bool
	}{
		"valid":             {func(p *Place) {}, false},
		"zero coordinates":  {func(p *Place) { p.Latitude, p.Longitude = 0, 0 }, false},
		"empty name":        {func(p *Place) { p.Name = "  " }, true},
		"bad trip id":       {func(p *Place) { p.TripID = "1" }, true},
		"bad category":      {func(p *Place) { p.Category = "bar" }, true},
		"latitude too big":  {func(p *Place) { p.Latitude = 91 }, true},
		"longitude too low": {func(p *Place) { p.Longitude = -181 }, true},
		"negative expenses": {func(p *Place) { p.Expenses = -1 }, true},
		"rating zero":       {func(p *Place) { p.Rating = ptr(0) }, true},
		"rating six":        {func(p *Place) { p.Rating = ptr(6) }, true},
		"bad date":          {func(p *Place) { p.VisitDate = ptr("31/12/2024") }, true},
		"good date":         {func(p *Place) { p.VisitDate = ptr("2024-12-31") }, false},
	}
	for name, tc := range cases {
		p := validPlace()
		tc.mutate(&p)
		if err := p.Validate(); (err != nil) != tc.wantErr {
			t.Errorf("%s: err=%v wantErr=%v", name, err, tc.wantErr)
		}
	}
}

func TestPlaceUpdateValidate(t *testing.T) {
	if err := (&PlaceUpdate{}).Validate(); err != nil {
		t.Errorf("empty update should be valid: %v", err)
	}
	if err := (&PlaceUpdate{Expenses: ptr(0.0), Latitude: ptr(0.0)}).Validate(); err != nil {
		t.Errorf("zero values should be valid: %v", err)
	}
	if err := (&PlaceUpdate{Name: ptr("")}).Validate(); err == nil {
		t.Error("empty name should be rejected")
	}
	if err := (&PlaceUpdate{Expenses: ptr(-5.0)}).Validate(); err == nil {
		t.Error("negative expenses should be rejected")
	}
}

func TestTripValidate(t *testing.T) {
	if err := (&Trip{Name: "París"}).Validate(); err != nil {
		t.Errorf("valid trip rejected: %v", err)
	}
	if err := (&Trip{Name: ""}).Validate(); err == nil {
		t.Error("empty name should be rejected")
	}
	if err := (&Trip{Name: strings.Repeat("a", 256)}).Validate(); err == nil {
		t.Error("long name should be rejected")
	}
	if err := (&TripUpdate{Rating: ptr(7)}).Validate(); err == nil {
		t.Error("invalid rating should be rejected")
	}
	if err := (&TripUpdate{}).Validate(); err != nil {
		t.Errorf("empty update should be valid: %v", err)
	}
}

func TestCreatePhotoRequestValidate(t *testing.T) {
	cases := map[string]struct {
		req     CreatePhotoRequest
		wantErr bool
	}{
		"jpeg data url":  {CreatePhotoRequest{PhotoURL: "data:image/jpeg;base64,AAAA"}, false},
		"https url":      {CreatePhotoRequest{PhotoURL: "https://example.com/a.jpg"}, false},
		"blob url":       {CreatePhotoRequest{PhotoURL: "blob:http://localhost:3000/abc"}, true},
		"http url":       {CreatePhotoRequest{PhotoURL: "http://example.com/a.jpg"}, true},
		"javascript url": {CreatePhotoRequest{PhotoURL: "javascript:alert(1)"}, true},
		"svg data url":   {CreatePhotoRequest{PhotoURL: "data:image/svg+xml;base64,AAAA"}, true},
		"empty data":     {CreatePhotoRequest{PhotoURL: "data:image/png;base64,"}, true},
		"long caption": {CreatePhotoRequest{
			PhotoURL: "https://example.com/a.jpg", Caption: ptr(strings.Repeat("a", 201)),
		}, true},
	}
	for name, tc := range cases {
		if err := tc.req.Validate(); (err != nil) != tc.wantErr {
			t.Errorf("%s: err=%v wantErr=%v", name, err, tc.wantErr)
		}
	}
}
