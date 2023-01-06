# Binary Install

Supports four architectures: darwin-amd64、linux-amd64、darwin-arm64、linux-arm64


## Mac AMD64 Architecture

```
# Get latest version
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# MacOS amd64 system
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-darwin-amd64.tar.gz" -O clickvisual-${latest}.tar.gz
```

![img.png](../../../images/binary-download.png)

## Linux AMD64 Architecture
```
# Get latest version
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# Linux amd64 system
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-linux-amd64.tar.gz" -O clickvisual-${latest}.tar.gz
```
## Mac ARM64 Architecture
```
# Get latest version
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# Mac arm64 system
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-mac-arm64.tar.gz" -O clickvisual-${latest}.tar.gz
```

## Linux ARM64 Architecture
```
# Get latest version
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# Linux arm64 system
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-linux-arm64.tar.gz" -O clickvisual-${latest}.tar.gz
```

## Start ClickVisual
```
# Unzip
mkdir -p ./clickvisual-${latest} && tar -zxvf clickvisual-${latest}.tar.gz -C ./clickvisual-${latest}

# Modify config/default.toml, change mysql, redis and other configurations to your own.
# Run ClickVisual with the following command:
```bash
cd ./clickvisual-${latest} && ./clickvisual -config config/default.toml
```

# Access http://localhost:19001
# login username: clickvisual
# login password: clickvisual
```