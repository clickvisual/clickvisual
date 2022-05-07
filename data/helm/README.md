# Mogo Helm Chart

This Helm chart is a lightweight way to configure and run mogo image

## Requirements

- Kubernetes >= 1.17
- Helm >= 3.0.0

## Installing 

### Install Mogo using master branch

- Clone repo:
```bash
git clone https://github.com/clickvisual/clickvisual.git
cd mogo && cp api/config/default.toml data/helm/mogo/default.toml
```

- [**suggested**] use helm install to install mogo directly
```bash
helm install mogo data/helm/mogo --set image.tag=latest --namespac default
# you may use "--set image.repository" to override default image path
# helm install mogo data/helm/mogo --set image.repository=${YOUR_HARBOR}/${PATH}/mogo --set image.tag=latest --namespace default
```

- [optional] use helm template to render manifest to yaml, then use kubectl to apply yaml 
```bash
# open ata/helm/mogo/default.toml, then change database and redis or other section configuration, then use helm to render yaml to local directory
helm template mogo data/helm/mogo --set image.tag=latest > mogo.yaml
# you may use "--set image.repository" to override default image path
# helm template mogo mogo --set image.repository=${YOUR_HARBOR}/${PATH}/mogo --set image.tag=latest > mogo.yaml

# check mogo.yaml and modified it if you want, then apply it to kubernetes with kubectl
kubectl apply -f mogo.yaml --namespace default
```
