package upload

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"path"
	"time"

	"github.com/ego-component/eos"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/internal/pkg/config"

	"github.com/clickvisual/clickvisual/api/cmd"
)

var CmdRun = &cobra.Command{
	Use:   "upload",
	Short: "启动 clickvisual 命令行",
	Long:  `启动 clickvisual 命令行`,
	Run:   CmdFunc,
	PreRun: func(cmd *cobra.Command, args []string) {
		log.Println("PreRun args: ", args)
		config.PreRun(cmd, args)
	},
}

var (
	pathName string
)

func init() {
	CmdRun.PersistentFlags().StringVar(&pathName, "pathName", "", "指定日志文件路径")
	cmd.RootCommand.AddCommand(CmdRun)
}

// CmdFunc 实验性方法 2023-11-08
func CmdFunc(cmd *cobra.Command, args []string) {
	// 是否需要上传文件
	fileBytes, err := os.ReadFile(pathName)
	if err != nil {
		elog.Panic("read file error", elog.FieldErr(err), elog.FieldName(pathName))
	}
	eosObj := eos.Load("upload").Build()

	// 上传到s3
	err = eosObj.Put(context.Background(), fmt.Sprintf("clickvisual-upload-log/%s/%s", time.Now().Format("2006_01_02"), path.Ext(pathName)), bytes.NewReader(fileBytes), nil)
	if err != nil {
		elog.Panic("put file error", elog.FieldErr(err), elog.FieldName(pathName))
	}
}
