package init

import (
	"fmt"
	"net/url"
	"os"
	"sort"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	appconfig "github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/install"
)

// InitConfig TOML 配置结构
type InitConfig struct {
	ClickhouseDSN       string   `toml:"clickhouse_dsn"`
	Cluster             string   `toml:"cluster"`
	Brokers             []string `toml:"brokers"`
	TopicsApp           string   `toml:"topics_app"`
	TopicsEgo           string   `toml:"topics_ego"`
	TopicsIngressStdout string   `toml:"topics_ingress_stdout"`
	TopicsIngressStderr string   `toml:"topics_ingress_stderr"`
}

var (
	initConfigFile      string
	clickhouseDSN       string
	cluster             string
	brokers             string
	topicsApp           string
	topicsEgo           string
	topicsIngressStdout string
	topicsIngressStderr string
	dryRun              bool

	migrateMetadataSchema       = install.Migration
	initializeEgoServicesForEgo = func() {
		ego.New().Invoker(
			invoker.Init,
			service.Init,
		)
	}
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		op, err := service.InstanceManager.Load(instanceID)
		if err != nil {
			return nil, err
		}
		return op.ClusterInfo()
	}
	createClickHouseInstanceForEgo    = createClickHouseInstance
	validateClickHouseClusterForEgo   = validateClickHouseCluster
	createLoggerDatabaseForEgo        = createLoggerDatabase
	createEgoStorageTemplateForEgo    = createEgoStorageTemplate
	databaseInfoX                     = db.DatabaseInfoX
	databaseDelete                    = db.DatabaseDelete
	createDatabase                    = service.DatabaseCreate
	defaultCreateStorageByEgoTemplate = func(uid int, database db.BaseDatabase, req view.ReqCreateStorageByTemplateEgo) error {
		if service.Storage == nil {
			return fmt.Errorf("storage service 未初始化")
		}
		return service.Storage.CreateByEgoTemplate(uid, database, req)
	}
	createStorageByEgoTemplate = defaultCreateStorageByEgoTemplate
)

var CmdInit = &cobra.Command{
	Use:   "ego",
	Short: "初始化 ClickVisual 实例和存储",
	Long:  `初始化 ClickVisual 实例和存储，包括创建 ClickHouse 实例、logger 数据库和 ego 存储模板`,
	PreRun: func(cmd *cobra.Command, args []string) {
		config.PreRun(cmd, args)
	},
	Run: CmdFunc,
}

func init() {
	CmdInit.InheritedFlags()
	CmdInit.Flags().StringVarP(&initConfigFile, "init-config", "i", "", "初始化配置文件路径")
	CmdInit.Flags().StringVarP(&clickhouseDSN, "clickhouse-dsn", "d", "", "ClickHouse DSN 连接字符串")
	CmdInit.Flags().StringVar(&cluster, "cluster", "", "ClickHouse cluster 名称")
	CmdInit.Flags().StringVarP(&brokers, "brokers", "b", "", "Kafka brokers 地址")
	CmdInit.Flags().StringVarP(&topicsApp, "topics-app", "", "", "应用日志 topic")
	CmdInit.Flags().StringVarP(&topicsEgo, "topics-ego", "", "", "Ego 日志 topic")
	CmdInit.Flags().StringVarP(&topicsIngressStdout, "topics-ingress-stdout", "", "", "Ingress stdout topic")
	CmdInit.Flags().StringVarP(&topicsIngressStderr, "topics-ingress-stderr", "", "", "Ingress stderr topic")
	CmdInit.Flags().BoolVar(&dryRun, "dry-run", false, "只解析配置，不执行实际操作")

	cmd.RootCommand.AddCommand(CmdInit)
}

func CmdFunc(cmd *cobra.Command, args []string) {
	// 加载初始化配置
	if initConfigFile != "" {
		if err := loadInitConfig(initConfigFile); err != nil {
			elog.Panic("加载初始化配置失败: " + err.Error())
		}
	}
	clickhouseDSN = normalizeClickHouseDSN(clickhouseDSN)
	cluster = normalizeClusterName(cluster)

	// 验证必需参数，设置默认值
	if clickhouseDSN == "" {
		elog.Panic("ClickHouse DSN 不能为空")
	}
	if err := validateClickHouseDSN(clickhouseDSN); err != nil {
		elog.Panic(err.Error())
	}
	if brokers == "" {
		brokers = "kafka-service.default:9092"
	}
	if topicsApp == "" {
		topicsApp = "app-stdout-logs-ilogtail"
	}
	if topicsEgo == "" {
		topicsEgo = "ego-stdout-logs-ilogtail"
	}
	if topicsIngressStdout == "" {
		topicsIngressStdout = "ingress-stdout-logs-ilogtail"
	}
	if topicsIngressStderr == "" {
		topicsIngressStderr = "ingress-stderr-logs-ilogtail"
	}

	// 显示解析后的配置
	elog.Info("配置解析完成:")
	elog.Info("ClickHouse DSN: " + clickHouseDSNLogValue(clickhouseDSN))
	elog.Info("ClickHouse Cluster: " + cluster)
	elog.Info("Kafka Brokers: " + brokers)
	elog.Info("Topics App: " + topicsApp)
	elog.Info("Topics Ego: " + topicsEgo)
	elog.Info("Topics Ingress Stdout: " + topicsIngressStdout)
	elog.Info("Topics Ingress Stderr: " + topicsIngressStderr)

	if dryRun {
		elog.Info("Dry run 模式，跳过实际操作")
		return
	}

	if err := ensureMetadataSchemaForEgo(); err != nil {
		elog.Panic("初始化 metadata schema 失败: " + err.Error())
	}

	// 初始化应用
	initializeEgoServicesForEgo()

	// 执行初始化步骤
	if err := initializeClickVisual(); err != nil {
		elog.Panic("初始化失败: " + redactSensitiveValue(err.Error(), clickhouseDSN))
	}

	fmt.Println("ClickVisual 初始化完成")
}

func ensureMetadataSchemaForEgo() error {
	if !appconfig.IsPrivateLiteMode() {
		return nil
	}
	elog.Info("private-lite 模式，先初始化最小 metadata schema")
	return migrateMetadataSchema()
}

// loadInitConfig 加载初始化配置文件
func loadInitConfig(configFile string) error {
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		return fmt.Errorf("配置文件不存在: %s", configFile)
	}

	// 读取配置文件内容
	content, err := os.ReadFile(configFile)
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %v", err)
	}

	elog.Info("加载初始化配置文件: " + configFile)

	// 解析配置文件内容
	if err := parseConfigContent(string(content)); err != nil {
		return fmt.Errorf("解析配置文件失败: %v", err)
	}

	return nil
}

// parseConfigContent 解析 TOML 配置文件内容
func parseConfigContent(content string) error {
	var config InitConfig

	// 使用 TOML 库解析配置内容
	if err := toml.Unmarshal([]byte(content), &config); err != nil {
		return fmt.Errorf("解析 TOML 配置失败: %v", err)
	}

	// 只有当命令行参数未设置时，才使用配置文件中的值
	if clickhouseDSN == "" && config.ClickhouseDSN != "" {
		clickhouseDSN = config.ClickhouseDSN
	}

	if brokers == "" && len(config.Brokers) > 0 {
		brokers = strings.Join(config.Brokers, ",")
	}

	if topicsApp == "" && config.TopicsApp != "" {
		topicsApp = config.TopicsApp
	}

	if topicsEgo == "" && config.TopicsEgo != "" {
		topicsEgo = config.TopicsEgo
	}

	if topicsIngressStdout == "" && config.TopicsIngressStdout != "" {
		topicsIngressStdout = config.TopicsIngressStdout
	}

	if topicsIngressStderr == "" && config.TopicsIngressStderr != "" {
		topicsIngressStderr = config.TopicsIngressStderr
	}

	cluster = normalizeClusterName(cluster)
	if cluster == "" {
		cluster = normalizeClusterName(config.Cluster)
	}
	clickhouseDSN = normalizeClickHouseDSN(clickhouseDSN)

	return nil
}

// initializeClickVisual 执行 ClickVisual 初始化
func initializeClickVisual() error {
	elog.Info("开始初始化 ClickVisual...")

	// 1. 创建 ClickHouse 实例
	instance, err := createClickHouseInstanceForEgo()
	if err != nil {
		return fmt.Errorf("创建 ClickHouse 实例失败: %v", err)
	}
	elog.Info("ClickHouse 实例创建成功", elog.Int("ID", instance.ID))

	if err := validateClickHouseClusterForEgo(instance.ID, cluster); err != nil {
		return fmt.Errorf("校验 ClickHouse cluster 失败: %w", err)
	}

	// 2. 创建 logger 数据库
	database, err := createLoggerDatabaseForEgo(instance)
	if err != nil {
		return fmt.Errorf("创建 logger 数据库失败: %v", err)
	}
	elog.Info("logger 数据库创建成功", elog.Int("ID", database.ID))

	// 3. 创建 ego 存储模板
	err = createEgoStorageTemplateForEgo(database)
	if err != nil {
		return fmt.Errorf("创建 ego 存储模板失败: %v", err)
	}
	elog.Info("ego 存储模板创建成功")

	return nil
}

// createClickHouseInstance 创建 ClickHouse 实例
func createClickHouseInstance() (*db.BaseInstance, error) {
	elog.Info("创建 ClickHouse 实例...")
	if err := validateClickHouseDSN(clickhouseDSN); err != nil {
		return nil, err
	}

	// 检查 ClickHouse 实例是否存在
	instance, err := db.InstanceInfoX(invoker.Db, map[string]interface{}{"name": "clickhouse-instance"})
	if err != nil {
		// 未找到记录不视为错误，继续创建
		if !strings.Contains(strings.ToLower(err.Error()), "record not found") {
			return nil, err
		}
	}
	if instance.ID != 0 {
		return &instance, nil
	}
	req := view.ReqCreateInstance{
		Datasource: db.DatasourceClickHouse,
		Name:       "clickhouse-instance",
		Dsn:        clickhouseDSN,
		Desc:       "ClickVisual 初始化创建的 ClickHouse 实例",
	}
	instance, err = service.InstanceCreate(req)
	if err != nil {
		return nil, err
	}
	if instance.ID == 0 {
		elog.Error("创建 ClickHouse 实例失败", l.E(err))
		return nil, fmt.Errorf("创建 ClickHouse 实例失败")
	}
	return &instance, nil
}

// createLoggerDatabase 创建 logger 数据库
func createLoggerDatabase(instance *db.BaseInstance) (db.BaseDatabase, error) {
	if instance == nil || instance.ID == 0 {
		return db.BaseDatabase{}, fmt.Errorf("ClickHouse instance 未初始化")
	}
	elog.Info("创建 logger 数据库...")

	// 检查 logger 数据库是否存在
	database, err := databaseInfoX(invoker.Db, map[string]interface{}{"name": "logger"})
	if err != nil {
		// 未找到记录不视为错误，继续创建
		if !strings.Contains(strings.ToLower(err.Error()), "record not found") {
			return db.BaseDatabase{}, err
		}
	}
	if database.ID != 0 {
		// delete database
		err = databaseDelete(invoker.Db, database.ID)
		if err != nil {
			return db.BaseDatabase{}, fmt.Errorf("删除 logger 数据库失败: %v", err)
		}
	}
	req := db.BaseDatabase{
		Iid:          instance.ID,
		Name:         "logger",
		Cluster:      normalizeClusterName(cluster),
		Uid:          1, // 使用系统用户
		IsCreateByCV: 1,
		Desc:         "ClickVisual 初始化创建的 logger 数据库",
	}
	database, err = createDatabase(req)
	if err != nil {
		return db.BaseDatabase{}, err
	}
	database.Instance = instance

	return database, nil
}

// createEgoStorageTemplate 创建 ego 存储模板
func createEgoStorageTemplate(database db.BaseDatabase) error {
	elog.Info("创建 ego 存储模板...")

	req := view.ReqCreateStorageByTemplateEgo{
		Brokers:             brokers,
		DatabaseId:          database.ID,
		TopicsApp:           topicsApp,
		TopicsEgo:           topicsEgo,
		TopicsIngressStdout: topicsIngressStdout,
		TopicsIngressStderr: topicsIngressStderr,
	}
	elog.Info("createEgoStorageTemplate", l.A("databaseID", database.ID), l.A("cluster", database.Cluster), l.A("req", req))
	// 调用存储服务创建模板
	err := createStorageByEgoTemplate(1, database, req)
	if err != nil {
		return err
	}

	return nil
}

func normalizeClusterName(value string) string {
	return strings.TrimSpace(value)
}

func validateClickHouseCluster(instanceID int, clusterName string) error {
	clusterName = normalizeClusterName(clusterName)
	if clusterName == "" {
		return nil
	}

	clusters, err := loadClickHouseClusterInfo(instanceID)
	if err != nil {
		return fmt.Errorf("查询 ClickHouse system.clusters 失败: %w", err)
	}

	info, ok := clusters[clusterName]
	if !ok {
		available := make([]string, 0)
		for name, candidate := range clusters {
			if candidate.MaxShardNum > 1 || candidate.MaxReplicaNum > 1 {
				available = append(available, name)
			}
		}
		sort.Strings(available)
		availableText := strings.Join(available, ", ")
		if availableText == "" {
			availableText = "无"
		}
		return fmt.Errorf("ClickHouse cluster %q 不存在，可用多节点 cluster: %s", clusterName, availableText)
	}

	if info.MaxShardNum <= 1 && info.MaxReplicaNum <= 1 {
		return fmt.Errorf("ClickHouse cluster %q 为 1 shard × 1 replica，请移除 cluster 配置使用单机模式", clusterName)
	}
	return nil
}

func clickHouseDSNLogValue(value string) string {
	if strings.TrimSpace(value) == "" {
		return "not configured"
	}
	return "configured"
}

func redactSensitiveValue(message, value string) string {
	if strings.TrimSpace(value) == "" {
		return message
	}
	trimmedValue := strings.TrimSpace(value)
	sensitiveValues := []string{value, trimmedValue}
	if parsed, err := url.Parse(trimmedValue); err == nil {
		if parsed.User != nil {
			sensitiveValues = append(sensitiveValues, parsed.User.String(), parsed.User.Username())
			if password, ok := parsed.User.Password(); ok {
				sensitiveValues = append(sensitiveValues, password)
			}
		}
		for key, values := range parsed.Query() {
			key = strings.ToLower(key)
			if key == "username" || key == "password" {
				sensitiveValues = append(sensitiveValues, values...)
			}
		}
		for _, part := range strings.Split(parsed.RawQuery, "&") {
			pieces := strings.SplitN(part, "=", 2)
			if len(pieces) != 2 {
				continue
			}
			key, err := url.QueryUnescape(pieces[0])
			if err != nil {
				continue
			}
			key = strings.ToLower(key)
			if key == "username" || key == "password" {
				sensitiveValues = append(sensitiveValues, pieces[1])
			}
		}
	}
	uniqueSensitiveValues := make(map[string]struct{}, len(sensitiveValues))
	for _, sensitiveValue := range sensitiveValues {
		if strings.TrimSpace(sensitiveValue) != "" {
			uniqueSensitiveValues[sensitiveValue] = struct{}{}
			uniqueSensitiveValues[url.QueryEscape(sensitiveValue)] = struct{}{}
		}
	}
	sensitiveValues = sensitiveValues[:0]
	for sensitiveValue := range uniqueSensitiveValues {
		sensitiveValues = append(sensitiveValues, sensitiveValue)
	}
	sort.Slice(sensitiveValues, func(i, j int) bool {
		return len(sensitiveValues[i]) > len(sensitiveValues[j])
	})
	for _, sensitiveValue := range sensitiveValues {
		message = strings.ReplaceAll(message, sensitiveValue, "[REDACTED]")
	}
	return message
}

func normalizeClickHouseDSN(value string) string {
	return strings.TrimSpace(value)
}

func validateClickHouseDSN(value string) error {
	value = normalizeClickHouseDSN(value)
	if value == "" {
		return fmt.Errorf("ClickHouse DSN 格式无效")
	}
	if _, err := url.Parse(value); err != nil {
		return fmt.Errorf("ClickHouse DSN 格式无效")
	}
	return nil
}
