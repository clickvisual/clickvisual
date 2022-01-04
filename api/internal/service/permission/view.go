package permission

type (
	MenuTreeItem struct {
		Name     string         `yaml:"name" json:"name"`
		Path     string         `yaml:"path" json:"path"`
		Icon     string         `yaml:"icon" json:"icon"`
		Children []MenuTreeItem `yaml:"children" json:"children,omitempty"`
	}

	Resource struct {
		Permission []MenuTreeItem
	}
)
