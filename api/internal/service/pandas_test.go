package service

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestStructuralTransfer(t *testing.T) {
	type args struct {
		req []view.Column
	}
	tests := []struct {
		name    string
		args    args
		wantRes string
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				req: []view.Column{},
			},
			wantRes: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotRes := StructuralTransfer(tt.args.req); gotRes != tt.wantRes {
				t.Errorf("StructuralTransfer() = %v, want %v", gotRes, tt.wantRes)
			}
		})
	}
}
