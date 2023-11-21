package manager

import (
	"strings"
	"time"

	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
)

const k8sPodNameLabel = "io.kubernetes.pod.name"
const k8sPodNameSpaceLabel = "io.kubernetes.pod.namespace"
const k8sPodUUIDLabel = "io.kubernetes.pod.uid"

type DockerInfo struct {
	ContainerInfo *ContainerInfo
	// K8SInfo       *K8SInfo
	// LogPath       string
}

/*
*
Containerd
// (*v1.Container)(0xc000bb6d20)(&Container{
//  Id:f9ffa3100560ed2359d37492b16bdee3f7aa685ad32a8f4e2d29815cce1b0356,
//   PodSandboxId:52f8f44d07374cfe90875cc576626efbac36acfe08d5dc88c2249121cd5028e8,
//  Metadata:&ContainerMetadata{Name:svc-edit-worker-rdoc,Attempt:7,},
// Image:&ImageSpec{Image:sha256:6d86e41c4ab4882db6e34ca4ac4ca9bcef5206824ee3a889d5ee49993b054c1b,
//Annotations:map[string]string{},},
//ImageRef:sha256:6d86e41c4ab4882db6e34ca4ac4ca9bcef5206824ee3a889d5ee49993b054c1b,
//State:CONTAINER_RUNNING,
//CreatedAt:1699328747358158398,
// Labels:map[string]string{
// io.kubernetes.container.name: svc-edit-worker-rdoc,
// io.kubernetes.pod.name: svc-edit-worker-rdoc-7b8fbf46b-jcm6d,
// io.kubernetes.pod.namespace: co-pro
// io.kubernetes.pod.uid: 2bb5f6b6-7ab7-4f28-be91-27e7b9d298a6,
//},Annotations:map[string]string{io.kubernetes.container.hash: 5b912111,io.kubernetes.container.ports: [{"containerPort":9001,"protocol":"TCP"},{"containerPort":9003,"protocol":"TCP"}],io.kubernetes.container.restartCount: 7,io.kubernetes.container.terminationMessagePath: /dev/termination-log,io.kubernetes.container.terminationMessagePolicy: File,io.kubernetes.pod.terminationGracePeriod: 30,},})
*/
type ContainerInfo struct {
	Id        string
	Name      string // 	为了兼容老的k8s，containerd，没有name
	Namespace string
	Container string
	Pod       string
	Image     string
	// v1.ContainerState
	State     string
	PodUid    string
	CreatedAt int64
	LogPath   string
	Labels    map[string]string
}

type K8SInfo struct {
	Namespace       string
	Container       string
	Pod             string
	Image           string
	PodUid          string
	Labels          map[string]string
	PausedContainer bool
	// matchedCache    map[uint64]bool
	// mu sync.Mutex
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

func CreateInfoDetail(info *ContainerInfo) *DockerInfo {
	// 获取镜像名称
	if strings.HasPrefix(info.Name, "/k8s_") || strings.HasPrefix(info.Name, "k8s_") || strings.Count(info.Name, "_") >= 4 {
		tags := strings.SplitN(info.Name, "_", 6)
		elog.Info("k8s container tags info", l.A("tags", tags), l.S("image", info.Image))
		baseIndex := 0
		if len(tags) == 6 {
			baseIndex = 1
		}
		info.Namespace = tags[baseIndex+2]
		info.Container = tags[baseIndex]
		info.Pod = tags[baseIndex+1]
		info.PodUid = tags[baseIndex+3]
	} else if _, ok := info.Labels[k8sPodNameLabel]; ok {
		info.Namespace = info.Labels[k8sPodNameSpaceLabel]
		info.Container = info.Name
		info.Pod = info.Labels[k8sPodNameLabel]
		info.PodUid = info.Labels[k8sPodUUIDLabel]
	} else {
		// 3. treat as normal container
		if strings.HasPrefix(info.Name, "/") {
			info.Container = info.Name[1:]
		} else {
			info.Container = info.Name
		}
	}

	dockerInfo := &DockerInfo{
		ContainerInfo: info,
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
