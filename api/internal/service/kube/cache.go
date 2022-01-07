package kube

import (
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"

	appsv1 "k8s.io/client-go/listers/apps/v1"
	corev1 "k8s.io/client-go/listers/core/v1"

	"github.com/shimohq/mogo/api/internal/service/kube/api"
)

type CacheFactory struct {
	stopChan              chan struct{}
	sharedInformerFactory informers.SharedInformerFactory
}

func buildCacheController(client *kubernetes.Clientset) (*CacheFactory, error) {
	stop := make(chan struct{})
	sharedInformerFactory := informers.NewSharedInformerFactory(client, defaultResyncPeriod)

	// Start all Resources defined in KindToResourceMap
	for _, value := range api.KindToResourceMap {
		genericInformer, err := sharedInformerFactory.ForResource(value.GroupVersionResourceKind.GroupVersionResource)
		if err != nil {
			return nil, err
		}
		go genericInformer.Informer().Run(stop)
	}

	sharedInformerFactory.Start(stop)

	return &CacheFactory{
		stopChan:              stop,
		sharedInformerFactory: sharedInformerFactory,
	}, nil
}

func (c *CacheFactory) PodLister() corev1.PodLister {
	return c.sharedInformerFactory.Core().V1().Pods().Lister()
}

func (c *CacheFactory) DeploymentLister() appsv1.DeploymentLister {
	return c.sharedInformerFactory.Apps().V1().Deployments().Lister()
}
