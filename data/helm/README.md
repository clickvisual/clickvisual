# ClickVisual Helm Chart

This Helm chart is a lightweight way to configure and run clickvisual image

## Requirements

- Kubernetes >= 1.17
- Helm >= 3.0.0

## Installing 

### Install ClickVisual using master branch

- Clone repo:
```bash
git clone https://github.com/clickvisual/clickvisual.git
cd clickvisual && cp api/config/default.toml data/helm/clickvisual/default.toml
```

- [**suggested**] use helm install to install clickvisual directly
```bash
helm install clickvisual data/helm/clickvisual --set image.tag=latest --namespac default
# you may use "--set image.repository" to override default image path
# helm install clickvisual data/helm/clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest --namespace default
```

- [optional] use helm template to render manifest to yaml, then use kubectl to apply yaml 
```bash
# open ata/helm/clickvisual/default.toml, then change database and redis or other section configuration, then use helm to render yaml to local directory
helm template clickvisual data/helm/clickvisual --set image.tag=latest > clickvisual.yaml
# you may use "--set image.repository" to override default image path
# helm template clickvisual clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest > clickvisual.yaml

# check clickvisual.yaml and modified it if you want, then apply it to kubernetes with kubectl
kubectl apply -f clickvisual.yaml --namespace default
```
