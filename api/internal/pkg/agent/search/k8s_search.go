package search

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search/searchexcel"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/ego-component/ek8s"
	"github.com/ego-component/eos"
	"github.com/ego-component/excelplus"
	"github.com/gotomicro/ego/client/ehttp"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func k8sAllCurlSearch(req Request) (data view.RespAgentSearch, err error) {
	obj := ek8s.Load("k8s").Build()
	if econf.GetString("k8s.labelSelector") == "" {
		elog.Panic("k8s label selector cant empty")
	}
	list2, err := obj.CoreV1().Pods(req.Namespace).List(context.Background(), metav1.ListOptions{
		LabelSelector: econf.GetString("k8s.labelSelector"),
	})
	if err != nil {
		elog.Error("k8s get pods error", elog.FieldErr(err), elog.Any("namespace", econf.GetString("inspectLog.namespace")), elog.Any("labelSelector", econf.GetString("k8s.labelSelector")))
	}
	ips := make([]string, 0)
	for _, value := range list2.Items {
		ips = append(ips, value.Status.PodIP)
	}

	if len(ips) == 0 {
		return data, nil
	}

	eclient := ehttp.Load("").Build()
	exFile := excelplus.Load().Build(
		excelplus.WithDefaultSheetName("结果表"),
		excelplus.WithS3(eos.Load("upload").Build()),
		excelplus.WithEnableUpload(req.IsUploadExcel),
	)
	exSheet, err := exFile.NewSheet("结果表", searchexcel.Logger{})
	if err != nil {
		elog.Panic("agent new sheet error", elog.FieldErr(err))
	}

	v := url.Values{}
	v.Set("isK8s", "1")
	v.Set("keyWord", req.KeyWord)
	if req.Date != "" {
		req.StartTime, req.EndTime = calculateStartTimeAndEndTime(req.Date)
	}

	v.Set("startTime", cast.ToString(req.StartTime))
	v.Set("endTime", cast.ToString(req.EndTime))
	v.Set("limit", cast.ToString(req.Limit))
	v.Set("namespace", req.Namespace)

	elog.Info("k8s ips", elog.FieldValueAny(ips))

	for _, ip := range ips {
		url := "http://" + ip + ":" + econf.GetString("k8s.port") + "/api/v1/search?" + v.Encode()
		elog.Info("k8s log url", elog.FieldValueAny(url))
		resp, err := eclient.SetTimeout(30 * time.Second).R().Get(url)
		if err != nil {
			elog.Error("eclient log fail", elog.FieldErr(err), elog.Any("ip", ip))
			continue
		}
		var output LogRes
		err = json.Unmarshal(resp.Body(), &output)
		if err != nil {
			elog.Panic("json unmarshal fail", elog.FieldErr(err))
		}
		for _, value := range output.Data.Data {
			if value.Line == "" {
				continue
			}

			var timeInfo string
			curTime, indexValue := utils.IndexParseTime(value.Line)
			if indexValue > 0 {
				timeInfo = time.Unix(curTime, 0).Format("2006-01-02 15:04:05")
			}
			loggerInfo := searchexcel.Logger{
				FilePath:  value.Ext["_file_"].(string),
				Ip:        ip,
				Log:       value.Line,
				Time:      timeInfo,
				Namespace: value.Ext["_namespace_"].(string),
				Container: value.Ext["_container_"].(string),
				Pod:       value.Ext["_pod_"].(string),
				Image:     value.Ext["_image_"].(string),
			}
			err = exSheet.SetRow(loggerInfo)
			if err != nil {
				elog.Panic("agent set row error", elog.FieldErr(err))
			}
		}
	}

	err = exFile.SaveAs(context.Background(), fmt.Sprintf("clickvisual_log_search/%s/agent_search_%s.xlsx", time.Now().Format("2006_01_02"), time.Now().Format("2006_01_02_15_04_05")))
	if err != nil {
		elog.Panic("agent save as error", elog.FieldErr(err))
	}
	return data, nil
}
