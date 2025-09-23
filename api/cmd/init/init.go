package init

import (
	"bufio"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
)

var (
	flagSQLFile  string
	flagDatabase string
)

// CmdRun initializes database using migration SQL
var CmdRun = &cobra.Command{
	Use:   "init",
	Short: "初始化数据库（执行 migration SQL）",
	Long:  "从 scripts/migration/database.sql 读取 SQL 并初始化数据库，支持 --sql 指定自定义 SQL 文件",
	PreRun: func(cmd *cobra.Command, args []string) {
		config.PreRun(cmd, args)
	},
	Run: func(cmd *cobra.Command, args []string) {
		_ = ego.New().Invoker(invoker.Init)

		path := flagSQLFile
		if strings.TrimSpace(path) == "" {
			path = "scripts/migration/database.sql"
		}
		abs, _ := filepath.Abs(path)
		elog.Info("使用 SQL 文件", elog.String("path", abs))

		content, err := os.ReadFile(path)
		if err != nil {
			elog.Panic("读取 SQL 文件失败: " + err.Error())
		}

		sqlText := string(content)
		if strings.TrimSpace(flagDatabase) != "" {
			sqlText = rewriteDatabaseName(sqlText, flagDatabase)
		}

		stmts, err := splitSQL(sqlText)
		if err != nil {
			elog.Panic("解析 SQL 失败: " + err.Error())
		}
		if len(stmts) == 0 {
			elog.Panic("SQL 为空")
		}

		dbStd, err := invoker.Db.DB()
		if err != nil {
			elog.Panic("获取数据库连接失败: " + err.Error())
		}
		err = execInTx(dbStd, stmts)
		if err != nil {
			elog.Panic("执行 SQL 失败: " + err.Error())
		}
		fmt.Println("数据库初始化完成")
	},
}

func init() {
	CmdRun.Flags().StringVar(&flagSQLFile, "sql", "", "自定义 SQL 文件路径，默认 scripts/migration/database.sql")
	CmdRun.Flags().StringVar(&flagDatabase, "database", "", "自定义数据库名，覆盖迁移 SQL 中的 CREATE DATABASE/USE 语句")
	cmd.RootCommand.AddCommand(CmdRun)
}

// splitSQL 将包含多条语句的 SQL 文本拆分为独立可执行语句
func splitSQL(sqlText string) ([]string, error) {
	res := make([]string, 0)
	sb := strings.Builder{}
	scanner := bufio.NewScanner(strings.NewReader(sqlText))
	scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024*64)
	for scanner.Scan() {
		line := scanner.Text()
		trim := strings.TrimSpace(line)
		// 跳过空行与注释
		if trim == "" || strings.HasPrefix(trim, "--") || strings.HasPrefix(trim, "#") {
			continue
		}
		sb.WriteString(line)
		sb.WriteString("\n")
		if strings.HasSuffix(strings.TrimSpace(line), ";") {
			stmt := strings.TrimSpace(sb.String())
			stmt = strings.TrimSuffix(stmt, ";")
			stmt = strings.TrimSpace(stmt)
			if stmt != "" {
				res = append(res, stmt)
			}
			sb.Reset()
		}
	}
	// 处理最后未以分号结尾的语句
	last := strings.TrimSpace(sb.String())
	if last != "" {
		res = append(res, last)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return res, nil
}

// execInTx 在一个事务中顺序执行多条语句
func execInTx(db *sql.DB, stmts []string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	for _, s := range stmts {
		if strings.TrimSpace(s) == "" {
			continue
		}
		if _, err = tx.Exec(s); err != nil {
			return fmt.Errorf("执行失败: %v, SQL: %s", err, s)
		}
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	return nil
}

// rewriteDatabaseName 将 SQL 文本中的 CREATE DATABASE/USE 的库名替换为指定库名
func rewriteDatabaseName(sqlText, db string) string {
	// 仅替换语句开头的 CREATE DATABASE / USE，避免误伤表名等
	reCreate := regexp.MustCompile(`(?i)^(\s*CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+)([^\s;]+)`) // group1 前缀, group2 旧库名
	reUse := regexp.MustCompile(`(?i)^(\s*USE\s+)([^\s;]+)`)                                           // group1 前缀, group2 旧库名

	lines := strings.Split(sqlText, "\n")
	for i, line := range lines {
		trim := strings.TrimSpace(line)
		if trim == "" || strings.HasPrefix(trim, "--") || strings.HasPrefix(trim, "#") {
			continue
		}
		if reCreate.MatchString(line) {
			lines[i] = reCreate.ReplaceAllString(line, `${1}`+db)
			continue
		}
		if reUse.MatchString(line) {
			lines[i] = reUse.ReplaceAllString(line, `${1}`+db)
			continue
		}
	}
	return strings.Join(lines, "\n")
}
