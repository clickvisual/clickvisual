package changepwd

import (
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"

	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
)

var (
	cpUsername string
	cpPassword string
	cpLength   int
)

// CmdRun changepwd command
var CmdRun = &cobra.Command{
	Use:   "changepwd",
	Short: "为指定用户重置密码，并在标准输出返回新密码",
	Long:  `重置用户密码。默认用户为 clickvisual。可通过 --username 指定用户，支持 --password 指定新密码，未指定时将随机生成。`,
	PreRun: func(cmd *cobra.Command, args []string) {
		config.PreRun(cmd, args)
	},
	Run: func(cmd *cobra.Command, args []string) {
		// 保持与主程序一致的 flag 解析行为，避免某些环境下未解析 flags 的情况
		if !flag.Parsed() {
			_ = cmd.ParseFlags(os.Args[1:])
		}

		// 初始化应用，确保数据库可用
		_ = ego.New().Invoker(invoker.Init)

		if strings.TrimSpace(cpUsername) == "" {
			cpUsername = "clickvisual"
		}

		password := strings.TrimSpace(cpPassword)
		if password == "" {
			var err error
			password, err = generatePassword(cpLength)
			if err != nil {
				elog.Panic("生成密码失败: " + err.Error())
			}
		}

		// 查找用户
		conds := map[string]interface{}{"username": cpUsername}
		user, err := db.UserInfoX(conds)
		if err != nil {
			elog.Panic("查询用户失败: " + err.Error())
		}
		if user.ID == 0 {
			elog.Panic("用户不存在: " + cpUsername)
		}

		// 生成 hash 并更新
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			elog.Panic("加密密码失败: " + err.Error())
		}
		ups := map[string]interface{}{"password": string(hash)}
		if err := db.UserUpdate(invoker.Db, user.ID, ups); err != nil {
			elog.Panic("更新密码失败: " + err.Error())
		}

		// 仅输出新密码，便于脚本使用
		fmt.Println(password)
	},
}

func init() {
	CmdRun.Flags().StringVar(&cpUsername, "username", "clickvisual", "要重置密码的用户名，默认为 clickvisual")
	CmdRun.Flags().StringVar(&cpPassword, "password", "", "指定新密码，不指定则自动生成")
	CmdRun.Flags().IntVar(&cpLength, "length", 16, "自动生成密码长度，默认 16")

	cmd.RootCommand.AddCommand(CmdRun)
}

func generatePassword(n int) (string, error) {
	if n <= 0 {
		n = 16
	}
	// 生成足够的随机字节，然后 base64 编码并裁剪到目标长度
	buf := make([]byte, (n*6+7)/8+4) // 足量以便裁剪
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	pwd := base64.RawURLEncoding.EncodeToString(buf)
	if len(pwd) < n {
		return pwd, nil
	}
	return pwd[:n], nil
}
