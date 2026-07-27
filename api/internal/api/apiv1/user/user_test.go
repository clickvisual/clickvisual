package user

import (
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
)

func TestPasswordMatchesAcceptsMD5EncodedPassword(t *testing.T) {
	md5Password := utils.MD5Encode32("clickvisual")
	hash, err := bcrypt.GenerateFromPassword([]byte(md5Password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate hash: %v", err)
	}

	if err = passwordMatches(string(hash), md5Password, "md5"); err != nil {
		t.Fatalf("passwordMatches() error = %v", err)
	}
	if err = passwordMatches(string(hash), "clickvisual", "md5"); err == nil {
		t.Fatal("passwordMatches() error = nil, want raw password rejected when encoded=md5")
	}
}

func TestPasswordMatchesKeepsRawAndLegacyMD5Compatibility(t *testing.T) {
	rawHash, err := bcrypt.GenerateFromPassword([]byte("clickvisual"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate raw hash: %v", err)
	}
	if err = passwordMatches(string(rawHash), "clickvisual", ""); err != nil {
		t.Fatalf("passwordMatches() raw error = %v", err)
	}

	md5Hash, err := bcrypt.GenerateFromPassword([]byte(utils.MD5Encode32("clickvisual")), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate md5 hash: %v", err)
	}
	if err = passwordMatches(string(md5Hash), "clickvisual", ""); err != nil {
		t.Fatalf("passwordMatches() legacy md5 error = %v", err)
	}
}
