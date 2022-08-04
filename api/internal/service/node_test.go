package service

import (
	"testing"
)

func Test_hourPrecisionStr(t *testing.T) {
	type args struct {
		timestamp int64
	}
	tests := []struct {
		name string
		args args
		want int64
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				timestamp: 1659531462,
			},
			want: 0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := hourPrecision(tt.args.timestamp); got != tt.want {
				t.Errorf("hourPrecision() = %v, want %v", got, tt.want)
			}
		})
	}
}
