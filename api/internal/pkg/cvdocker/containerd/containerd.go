package containerd

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker/manager"
	docker "github.com/fsouza/go-dockerclient"
	"github.com/gotomicro/ego/core/elog"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
)

const maxMsgSize = 1024 * 1024 * 16

// Component ...
type Component struct {
	client cri.RuntimeServiceClient
}

func init() {
	manager.Register("containerd", &Component{})
}

// Run Component ...
func (c *Component) Run(config *manager.Config) error {
	client, err := newRuntimeServiceClient(config)
	if err != nil {
		elog.Panic("connect containerd fail", elog.FieldErr(err))
		return err
	}
	c.client = client
	return nil
}

func (c *Component) GetAllDockerInfo() (containerMap map[string]*manager.DockerInfo, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	containersResp, err := c.client.ListContainers(ctx, &cri.ListContainersRequest{Filter: nil})
	if err != nil {
		return nil, err
	}
	sandboxResp, err := c.client.ListPodSandbox(ctx, &cri.ListPodSandboxRequest{Filter: nil})
	if err != nil {
		return nil, err
	}
	sandboxMap := make(map[string]*cri.PodSandbox, len(sandboxResp.Items))
	for _, item := range sandboxResp.Items {
		sandboxMap[item.Id] = item
	}

	containerMap = make(map[string]*manager.DockerInfo)
	for _, container := range containersResp.Containers {
		if container.State == cri.ContainerState_CONTAINER_EXITED || container.State == cri.ContainerState_CONTAINER_UNKNOWN {
			continue
		}
		dockerContainer, err := c.createContainerInfo(ctx, container)
		if err != nil {
			continue
		}
		containerMap[container.GetId()] = dockerContainer
	}
	return
}

// GetAddressAndDialer returns the address parsed from the given endpoint and a dialer.
func GetAddressAndDialer(endpoint string) (string, func(addr string, timeout time.Duration) (net.Conn, error), error) {
	protocol, addr, err := parseEndpointWithFallbackProtocol(endpoint, "unix")
	if err != nil {
		return "", nil, err
	}
	if protocol != "unix" {
		return "", nil, fmt.Errorf("only support unix socket endpoint")
	}

	return addr, dial, nil
}

func dial(addr string, timeout time.Duration) (net.Conn, error) {
	return net.DialTimeout("unix", addr, timeout)
}

func parseEndpointWithFallbackProtocol(endpoint string, fallbackProtocol string) (protocol string, addr string, err error) {
	if protocol, addr, err = parseEndpoint(endpoint); err != nil && protocol == "" {
		fallbackEndpoint := fallbackProtocol + "://" + endpoint
		protocol, addr, err = parseEndpoint(fallbackEndpoint)
		if err == nil {
			elog.Infof("Using %q as endpoint is deprecated, please consider using full url format %q.", endpoint, fallbackEndpoint)
		}
	}
	return
}

func parseEndpoint(endpoint string) (string, string, error) {
	u, err := url.Parse(endpoint)
	if err != nil {
		return "", "", err
	}

	switch u.Scheme {
	case "tcp":
		return "tcp", u.Host, nil

	case "unix":
		return "unix", u.Path, nil

	case "":
		return "", "", fmt.Errorf("Using %q as endpoint is deprecated, please consider using full url format", endpoint)

	default:
		return u.Scheme, "", fmt.Errorf("protocol %q not supported", u.Scheme)
	}
}

func newRuntimeServiceClient(config *manager.Config) (cri.RuntimeServiceClient, error) {
	addr, dailer, err := GetAddressAndDialer("unix://" + config.ClientSocket)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), config.DockerTimeout)
	defer cancel()

	conn, err := grpc.DialContext(ctx, addr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithDialer(dailer), grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)))
	if err != nil {
		return nil, err
	}

	return cri.NewRuntimeServiceClient(conn), nil
}

func (c *Component) createContainerInfo(_ context.Context, cc *cri.Container) (*manager.DockerInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	status, err := c.client.ContainerStatus(ctx, &cri.ContainerStatusRequest{
		ContainerId: cc.GetId(),
		Verbose:     true,
	})
	cancel()
	if err != nil {
		return nil, err
	}

	image := status.GetStatus().GetImage().GetImage()
	if image == "" {
		image = status.GetStatus().GetImageRef()
	}

	dockerContainer := &docker.Container{
		ID:      cc.GetId(),
		LogPath: status.GetStatus().GetLogPath(),
		Config: &docker.Config{
			Image: image,
		},
	}

	if cc.GetMetadata() != nil {
		dockerContainer.Name = cc.GetMetadata().GetName()
	}

	return manager.CreateInfoDetail(dockerContainer), nil
}
