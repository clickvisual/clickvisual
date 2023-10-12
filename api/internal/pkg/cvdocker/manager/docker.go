package manager

import (
	"strings"
	"sync"
	"time"

	dockerclient "github.com/fsouza/go-dockerclient"
)

const k8sPodNameLabel = "io.kubernetes.pod.name"
const k8sPodNameSpaceLabel = "io.kubernetes.pod.namespace"
const k8sPodUUIDLabel = "io.kubernetes.pod.uid"

type DockerInfo struct {
	ContainerInfo *dockerclient.Container
	K8SInfo       *K8SInfo
	LogPath       string
}

type K8SInfo struct {
	Namespace       string
	Container       string
	Pod             string
	Image           string
	PodUid          string
	Labels          map[string]string
	PausedContainer bool
	matchedCache    map[uint64]bool
	mu              sync.Mutex
}

type Config struct {
	DockerTimeout time.Duration //  SetTimeout takes a timeout and applies it to the HTTPClient
	ClientSocket  string
}

func DefaultConfig() *Config {
	return &Config{
		DockerTimeout: 10 * time.Second,
		ClientSocket:  "",
	}
}

func CreateInfoDetail(info *dockerclient.Container) *DockerInfo {
	k8sInfo := K8SInfo{}
	// 获取镜像名称
	k8sInfo.Image = GetImageName(info.Image, info.Config.Image)
	if strings.HasPrefix(info.Name, "/k8s_") || strings.HasPrefix(info.Name, "k8s_") || strings.Count(info.Name, "_") >= 4 {
		tags := strings.SplitN(info.Name, "_", 6)
		baseIndex := 0
		if len(tags) == 6 {
			baseIndex = 1
		}
		k8sInfo.Namespace = tags[baseIndex+2]
		k8sInfo.Container = tags[baseIndex]
		k8sInfo.Pod = tags[baseIndex+1]
		k8sInfo.PodUid = tags[baseIndex+3]
	} else if _, ok := info.Config.Labels[k8sPodNameLabel]; ok {
		k8sInfo.Namespace = info.Config.Labels[k8sPodNameSpaceLabel]
		k8sInfo.Container = info.Name
		k8sInfo.Pod = info.Config.Labels[k8sPodNameLabel]
		k8sInfo.PodUid = info.Config.Labels[k8sPodUUIDLabel]
	} else {
		// 3. treat as normal container
		if strings.HasPrefix(info.Name, "/") {
			k8sInfo.Container = info.Name[1:]
		} else {
			k8sInfo.Container = info.Name
		}
	}

	dockerInfo := &DockerInfo{
		ContainerInfo: info,
		LogPath:       info.LogPath,
		K8SInfo:       &k8sInfo,
	}
	// ContainerNameTag:map[
	//    _container_name_:svc-edit-worker-modoc
	//    _image_name_:registryo.shimo.im/shimo-ee/svc-edit:f72ab67
	//    _namespace_:co-dev-arm
	//   _pod_name_:svc-edit-worker-modoc-6bd8c5bcf6-f6dwf
	//    _pod_uid_:17de7806-3aa1-4a5e-90ad-75a26e0702d9
	// ]
	// {ContainerInfo:0x4000a90fc0 ContainerNameTag:map[_container_name_:svc-edit-worker-modoc _image_name_:registryo.shimo.im/shimo-ee/svc-edit:f72ab67 _namespace_:co-dev-arm _pod_name_:svc-edit-worker-modoc-6bd8c5bcf6-f6dwf _pod_uid_:17de7806-3aa1-4a5e-90ad-75a26e0702d9] K8SInfo:0x4000dbc0a0 ContainerIP: DefaultRootPath: lastUpdateTime:{wall:13925684002425950101 ext:173980704 loc:0x5c38260}}%!v(MISSING)%!v(MISSING)%!v(MISSING)%!v(MISSING)
	// &{ContainerInfo:0x4000fb1200 ContainerNameTag:map[_container_name_:everest-csi-driver _image_name_:swr.cn-north-4.myhuaweicloud.com/hwofficial/everest:2.1.38 _namespace_:kube-system _pod_name_:everest-csi-driver-x5szv _pod_uid_:83ba57c2-4765-43ca-9e89-c836ae87433f] K8SInfo:0x4000ec0b40 ContainerIP: DefaultRootPath: lastUpdateTime:{wall:13925683693846915068 ext:76239161 loc:0x5c38260}}%!v(MISSING)%!v(MISSING)%!v(MISSING)%!v(MISSING)
	return dockerInfo
}

func GetImageName(id, defaultVal string) string {
	return defaultVal
}
