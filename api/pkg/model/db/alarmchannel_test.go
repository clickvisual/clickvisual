package db

import (
	"testing"
)

func TestAlarmChannel_JudgmentType(t *testing.T) {
	type fields struct {
		BaseModel BaseModel
		Name      string
		Key       string
		Typ       int
		Uid       int
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			fields: fields{
				Name: "name",
				Key:  "https://open.feishu.cn/open-apis/bot/v2/hook/",
				Typ:  3,
				Uid:  0,
			},
			wantErr: false,
		},
		{
			name: "test-2",
			fields: fields{
				Name: "name",
				Key:  "https://open.larksuite.com/open-apis/bot/v2/hook/",
				Typ:  3,
				Uid:  0,
			},
			wantErr: false,
		},
		{
			name: "test-3",
			fields: fields{
				Name: "name",
				Key:  "https://xxopen.feishu.cn/open-apis/bot/v2/hook/",
				Typ:  3,
				Uid:  0,
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &AlarmChannel{
				BaseModel: tt.fields.BaseModel,
				Name:      tt.fields.Name,
				Key:       tt.fields.Key,
				Typ:       tt.fields.Typ,
				Uid:       tt.fields.Uid,
			}
			if err := m.JudgmentType(); (err != nil) != tt.wantErr {
				t.Errorf("JudgmentType() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
