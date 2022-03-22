package session

// config
type config struct {
	Mode     string // session mod, "redis" by default, you can set it to "memstore"
	Name     string // session名称
	Debug    bool   // debug变量
	Keypairs string

	RedisSize     int
	RedisNetwork  string // 协议
	RedisAddr     string
	RedisPassword string
}

// DefaultConfig returns a default config of session container
func DefaultConfig() *config {
	return &config{
		Mode: "memstore",
	}
}
