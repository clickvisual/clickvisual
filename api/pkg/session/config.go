package session

// config
type config struct {
	Mode     string // session模式，默认redis，目前只支持redis和memstore
	Name     string // session名称
	Debug    bool   // debug变量
	Keypairs string

	RedisSize     int
	RedisNetwork  string // 协议
	RedisAddr     string
	RedisPassword string
}

// DefaultConfig 定义了esession默认配置
func DefaultConfig() *config {
	return &config{
		Mode: "memstore",
	}
}
