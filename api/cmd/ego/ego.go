package init

import (
	"fmt"
	"os"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

// InitConfig TOML 配置结构
type InitConfig struct {
	ClickhouseDSN       string   `toml:"clickhouse_dsn"`
	Brokers             []string `toml:"brokers"`
	TopicsApp           string   `toml:"topics_app"`
	TopicsEgo           string   `toml:"topics_ego"`
	TopicsIngressStdout string   `toml:"topics_ingress_stdout"`
	TopicsIngressStderr string   `toml:"topics_ingress_stderr"`
}

var (
	initConfigFile      string
	clickhouseDSN       string
	brokers             string
	topicsApp           string
	topicsEgo           string
	topicsIngressStdout string
	topicsIngressStderr string
	dryRun              bool
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
	CmdInit.Flags().StringVarP(&brokers, "brokers", "b", "", "Kafka brokers 地址")
	CmdInit.Flags().StringVarP(&topicsApp, "topics-app", "", "", "应用日志 topic")
	CmdInit.Flags().StringVarP(&topicsEgo, "topics-ego", "", "", "Ego 日志 topic")
	CmdInit.Flags().StringVarP(&topicsIngressStdout, "topics-ingress-stdout", "", "", "Ingress stdout topic")
	CmdInit.Flags().StringVarP(&topicsIngressStderr, "topics-ingress-stderr", "", "", "Ingress stderr topic")
	CmdInit.Flags().BoolVar(&dryRun, "dry-run", false, "只解析配置，不执行实际操作")

	cmd.RootCommand.AddCommand(CmdInit)
}

func CmdFunc(cmd *cobra.Command, args []string) {
	// 初始化应用
	ego.New().Invoker(
		invoker.Init,
		service.Init,
	)

	// 加载初始化配置
	if initConfigFile != "" {
		if err := loadInitConfig(initConfigFile); err != nil {
			elog.Panic("加载初始化配置失败: " + err.Error())
		}
	}

	// 验证必需参数，设置默认值
	if clickhouseDSN == "" {
		elog.Panic("ClickHouse DSN 不能为空")
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
	elog.Info("ClickHouse DSN: " + clickhouseDSN)
	elog.Info("Kafka Brokers: " + brokers)
	elog.Info("Topics App: " + topicsApp)
	elog.Info("Topics Ego: " + topicsEgo)
	elog.Info("Topics Ingress Stdout: " + topicsIngressStdout)
	elog.Info("Topics Ingress Stderr: " + topicsIngressStderr)

	if dryRun {
		elog.Info("Dry run 模式，跳过实际操作")
		return
	}

	// 执行初始化步骤
	if err := initializeClickVisual(); err != nil {
		elog.Panic("初始化失败: " + err.Error())
	}

	fmt.Println("ClickVisual 初始化完成")
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

	return nil
}

// initializeClickVisual 执行 ClickVisual 初始化
func initializeClickVisual() error {
	elog.Info("开始初始化 ClickVisual...")

	// 1. 创建 ClickHouse 实例
	instance, err := createClickHouseInstance()
	if err != nil {
		return fmt.Errorf("创建 ClickHouse 实例失败: %v", err)
	}
	elog.Info("ClickHouse 实例创建成功", elog.Int("ID", instance.ID))

	// 2. 创建 logger 数据库
	databaseID, err := createLoggerDatabase(instance.ID)
	if err != nil {
		return fmt.Errorf("创建 logger 数据库失败: %v", err)
	}
	elog.Info("logger 数据库创建成功", elog.Int("ID", databaseID))

	// 3. 创建 ego 存储模板
	err = createEgoStorageTemplate(databaseID, instance)
	if err != nil {
		return fmt.Errorf("创建 ego 存储模板失败: %v", err)
	}
	elog.Info("ego 存储模板创建成功")

	return nil
}

// createClickHouseInstance 创建 ClickHouse 实例
func createClickHouseInstance() (*db.BaseInstance, error) {
	elog.Info("创建 ClickHouse 实例...")

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
		elog.Error("创建 ClickHouse 实例失败", l.E(err), l.A("instance", instance))
		return nil, fmt.Errorf("创建 ClickHouse 实例失败")
	}
	return &instance, nil
}

// createLoggerDatabase 创建 logger 数据库
func createLoggerDatabase(instanceID int) (int, error) {
	elog.Info("创建 logger 数据库...")

	// 检查 logger 数据库是否存在
	database, err := db.DatabaseInfoX(invoker.Db, map[string]interface{}{"name": "logger"})
	if err != nil {
		// 未找到记录不视为错误，继续创建
		if !strings.Contains(strings.ToLower(err.Error()), "record not found") {
			return 0, err
		}
	}
	if database.ID != 0 {
		return database.ID, nil
	}
	req := db.BaseDatabase{
		Iid:          instanceID,
		Name:         "logger",
		Cluster:      "",
		Uid:          1, // 使用系统用户
		IsCreateByCV: 1,
		Desc:         "ClickVisual 初始化创建的 logger 数据库",
	}
	database, err = service.DatabaseCreate(req)
	if err != nil {
		return 0, err
	}

	return database.ID, nil
}

// createEgoStorageTemplate 创建 ego 存储模板
func createEgoStorageTemplate(databaseID int, instance *db.BaseInstance) error {
	elog.Info("创建 ego 存储模板...")

	req := view.ReqCreateStorageByTemplateEgo{
		Brokers:             brokers,
		DatabaseId:          databaseID,
		TopicsApp:           topicsApp,
		TopicsEgo:           topicsEgo,
		TopicsIngressStdout: topicsIngressStdout,
		TopicsIngressStderr: topicsIngressStderr,
	}
	elog.Info("createEgoStorageTemplate", l.A("instance", instance))
	// 调用存储服务创建模板
	database := db.BaseDatabase{}
	database.ID = databaseID
	database.Name = "logger"
	database.Iid = instance.ID
	database.Instance = instance
	err := service.Storage.CreateByEgoTemplate(1, database, req)
	if err != nil {
		return err
	}

	return nil
}
