package dto

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker/manager"
)

type AgentSearchTargetInfo struct {
	K8sInfo  *manager.ContainerInfo
	FilePath string
}
