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
			path = "./config/database.sql"
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

// SQLStatement 表示一个SQL语句及其类型
type SQLStatement struct {
	SQL  string
	Type string // "insert", "other"
}

// splitSQL 将包含多条语句的 SQL 文本拆分为独立可执行语句
func splitSQL(sqlText string) ([]SQLStatement, error) {
	res := make([]SQLStatement, 0)
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
				stmtType := "other"
				if strings.HasPrefix(strings.ToUpper(stmt), "INSERT") {
					stmtType = "insert"
				}
				res = append(res, SQLStatement{SQL: stmt, Type: stmtType})
			}
			sb.Reset()
		}
	}
	// 处理最后未以分号结尾的语句
	last := strings.TrimSpace(sb.String())
	if last != "" {
		stmtType := "other"
		if strings.HasPrefix(strings.ToUpper(last), "INSERT") {
			stmtType = "insert"
		}
		res = append(res, SQLStatement{SQL: last, Type: stmtType})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return res, nil
}

// checkDataExists 检查特定数据是否已存在
func checkDataExists(tx *sql.Tx, sqlStmt string) (bool, error) {
	// 检查 cv_user 表中的 clickvisual 用户
	if strings.Contains(sqlStmt, "cv_user") && strings.Contains(sqlStmt, "clickvisual") {
		var count int
		err := tx.QueryRow("SELECT COUNT(*) FROM cv_user WHERE id = 1 AND username = 'clickvisual'").Scan(&count)
		if err != nil {
			return false, err
		}
		return count > 0, nil
	}

	// 检查 cv_pms_casbin_rule 表中的规则
	if strings.Contains(sqlStmt, "cv_pms_casbin_rule") {
		var count int
		if strings.Contains(sqlStmt, "VALUES (1,") {
			// 检查 id=1 的策略规则
			err := tx.QueryRow("SELECT COUNT(*) FROM cv_pms_casbin_rule WHERE id = 1").Scan(&count)
			if err != nil {
				return false, err
			}
		} else if strings.Contains(sqlStmt, "VALUES (2,") {
			// 检查 id=2 的用户角色关联
			err := tx.QueryRow("SELECT COUNT(*) FROM cv_pms_casbin_rule WHERE id = 2").Scan(&count)
			if err != nil {
				return false, err
			}
		}
		return count > 0, nil
	}

	// 其他INSERT语句默认执行
	return false, nil
}

// execInTx 在一个事务中顺序执行多条语句
func execInTx(db *sql.DB, stmts []SQLStatement) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	for _, stmt := range stmts {
		if strings.TrimSpace(stmt.SQL) == "" {
			continue
		}

		// 对于INSERT语句，先检查数据是否已存在
		if stmt.Type == "insert" {
			exists, err := checkDataExists(tx, stmt.SQL)
			if err != nil {
				return fmt.Errorf("检查数据存在性失败: %v, SQL: %s", err, stmt.SQL)
			}
			if exists {
				elog.Info("数据已存在，跳过执行", elog.String("sql", stmt.SQL))
				continue
			}
		}

		if _, err = tx.Exec(stmt.SQL); err != nil {
			return fmt.Errorf("执行失败: %v, SQL: %s", err, stmt.SQL)
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
