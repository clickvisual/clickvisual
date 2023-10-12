package docker

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker/manager"
	dockerclient "github.com/fsouza/go-dockerclient"
	"github.com/gotomicro/ego/core/elog"
)

// Component ...
type Component struct {
	client *dockerclient.Client
}

func init() {
	manager.Register("docker", &Component{})
}

// Run Component ...
func (c *Component) Run(config *manager.Config) error {
	client, err := dockerclient.NewClientFromEnv()
	if err != nil {
		elog.Panic("connect docker fail", elog.FieldErr(err))
		return err
	}
	c.client = client
	c.client.SetTimeout(config.DockerTimeout)
	return nil
}

func (c *Component) GetAllDockerInfo() (containerMap map[string]*manager.DockerInfo, err error) {
	// 获取所有container信息
	containers, err := c.client.ListContainers(dockerclient.ListContainersOptions{})
	if err != nil {
		elog.Panic("docker list container fail ", elog.FieldErr(err))
	}
	for _, container := range containers {
		var containerDetail *dockerclient.Container
		for idx := 0; idx < 3; idx++ {
			if containerDetail, err = c.client.InspectContainerWithOptions(dockerclient.InspectContainerOptions{ID: container.ID}); err == nil {
				containerMap[container.ID] = manager.CreateInfoDetail(containerDetail)
			}
		}
	}
	return
}
