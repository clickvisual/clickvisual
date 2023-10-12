package manager

var (
	registry map[string]Client
)

func init() {
	registry = make(map[string]Client)
}

// Register registers a dataSource creator function to the registry.
func Register(scheme string, creator Client) {
	registry[scheme] = creator
}

func Get(scheme string) Client {
	return registry[scheme]
}

type Client interface {
	Run(config *Config) error // 启动
	GetAllDockerInfo() (map[string]*DockerInfo, error)
}
