package inquiry

import (
	"testing"
)

func Test_isTrace(t *testing.T) {
	type args struct {
		res map[string]interface{}
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				res: map[string]interface{}{
					"_raw_log_": `{\"traceId\":\"LYg0zYI7o4/+20t6HxoHyA==\",\"spanId\":\"AF19SgV41jQ=\",\"operationName\":\"expire\",\"startTime\":\"2022-08-31T07:15:41.810760008Z\",\"duration\":\"0.000066224s\",\"tags\":[{\"key\":\"otel.library.name\",\"vStr\":\"ego\"},{\"key\":\"net.host.ip\",\"vStr\":\"redis-sentinel-master-ss\"},{\"key\":\"net.peer.port\",\"vType\":\"INT64\",\"vInt64\":\"6379\"},{\"key\":\"db.system\",\"vStr\":\"redis\"},{\"key\":\"db.name\",\"vType\":\"INT64\"},{\"key\":\"db.operation\",\"vStr\":\"expire\"},{\"key\":\"db.statement\",\"vStr\":\"expire ws:guid:clients:WQ6bow7bEfRol0Bx 86400\"},{\"key\":\"span.kind\",\"vStr\":\"client\"}],\"process\":{\"serviceName\":\"noc-ws-api\",\"tags\":[{\"key\":\"host.name\",\"vStr\":\"noc-ws-api-745956dc48-82w5s\"},{\"key\":\"telemetry.sdk.language\",\"vStr\":\"go\"},{\"key\":\"telemetry.sdk.name\",\"vStr\":\"opentelemetry\"},{\"key\":\"telemetry.sdk.version\",\"vStr\":\"1.7.0\"}]}}`,
					"_key":      "1234567890",
				},
			},
			want: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isTrace(tt.args.res); got != tt.want {
				t.Errorf("isTrace() = %v, want %v", got, tt.want)
			}
		})
	}
}
