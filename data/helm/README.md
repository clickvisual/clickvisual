# Mogo Helm Chart

This Helm chart is a lightweight way to configure and run mogo image

## Requirements

- Kubernetes >= 1.17
- Helm >= 3.0.0

## Installing 

### Install Mogo using master branch

- Clone repo:
```bash
git clone https://github.com/shimohq/mogo.git
cd mogo && cp api/config/default.toml data/helm/mogo/default.toml

# open ata/helm/mogo/default.toml, then change database and redis or other section configuration, then use helm to render yaml to local directory
cd data/helm && helm template mogo mogo --set image.tag=latest > mogo.yaml
# you may use "--set image.repository" to override default image path
# cd data/helm && helm template mogo mogo --set image.repository=reg.smvm.cn/cicd/shimo-saas/mogo --set image.tag=latest > mogo.yaml

# check mogo.yaml and modified it if you want, then apply it to kubernetes 
kubectl apply -f mogo.yaml --namespace default
```