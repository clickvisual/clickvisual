package command

import (
	"fmt"
	"testing"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

func TestRuntimeMem(t *testing.T) {
	v, _ := mem.VirtualMemory()
	fmt.Println(v.Total, v.UsedPercent, v.Used, v.Free)

	c1, _ := cpu.Percent(time.Duration(time.Second), false)
	fmt.Println(c1)

	d, _ := disk.Usage("/")
	fmt.Println(d.Total, d.Used, d.UsedPercent)

	info, _ := net.IOCounters(false)
	fmt.Println(info[0].BytesSent, info[0].BytesRecv, info[0])
}
