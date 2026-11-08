package service

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/clickhouse"
	"io"
	"net"
	"testing"
	"time"
)

func TestQueryClickHouseHandshakeDeadline(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	accepted := make(chan net.Conn, 1)
	go func() {
		c, e := listener.Accept()
		if e == nil {
			accepted <- c
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	start := time.Now()
	conn, err := ClickHouseLinkContext(ctx, "tcp://"+listener.Addr().String()+"?dial_timeout=200ms&read_timeout=200")
	if conn != nil {
		conn.Close()
	}
	select {
	case c := <-accepted:
		c.Close()
	default:
	}
	if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > 150*time.Millisecond {
		t.Fatalf("native handshake ignored request budget: %v (%s)", err, time.Since(start))
	}
}

func TestQueryClickHouseHandshakeCancellation(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	accepted := make(chan net.Conn, 1)
	go func() {
		c, e := listener.Accept()
		if e == nil {
			accepted <- c
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	result := make(chan error, 1)
	go func() {
		conn, e := ClickHouseLinkContext(ctx, "clickhouse://"+listener.Addr().String()+"?dial_timeout=2s")
		if conn != nil {
			conn.Close()
		}
		result <- e
	}()
	var peer net.Conn
	select {
	case peer = <-accepted:
	case <-time.After(time.Second):
		t.Fatal("no native connection")
	}
	defer peer.Close()
	start := time.Now()
	cancel()
	select {
	case err = <-result:
	case <-time.After(time.Second):
		t.Fatal("handshake did not cancel")
	}
	if !errors.Is(err, context.Canceled) || time.Since(start) > time.Second {
		t.Fatalf("cancel lost: %v", err)
	}
}

func TestQueryClickHouseNativeCancellationAfterHandshake(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	queryStarted := make(chan struct{})
	serverResult := make(chan error, 1)
	go func() {
		peer, e := listener.Accept()
		if e != nil {
			serverResult <- e
			return
		}
		defer peer.Close()
		_ = peer.SetDeadline(time.Now().Add(2 * time.Second))
		reader := bufio.NewReader(peer)
		_, e = reader.ReadByte()
		readString := func() error {
			size, e := binary.ReadUvarint(reader)
			if e != nil {
				return e
			}
			_, e = io.CopyN(io.Discard, reader, int64(size))
			return e
		}
		if e == nil {
			e = readString()
		}
		for i := 0; i < 3 && e == nil; i++ {
			_, e = binary.ReadUvarint(reader)
		}
		for i := 0; i < 3 && e == nil; i++ {
			e = readString()
		}
		if e != nil {
			serverResult <- e
			return
		}
		_, e = peer.Write([]byte{5})
		if e != nil {
			serverResult <- e
			return
		}
		ping, e := reader.ReadByte()
		if e != nil || ping != 4 {
			serverResult <- fmt.Errorf("unexpected ping %d: %v", ping, e)
			return
		}
		_, e = peer.Write([]byte{4})
		if e != nil {
			serverResult <- e
			return
		}
		_, e = reader.ReadByte()
		if e != nil {
			serverResult <- e
			return
		}
		close(queryStarted)
		_, e = io.Copy(io.Discard, reader)
		serverResult <- e
	}()
	conn, err := ClickHouseLinkContext(context.Background(), "clickhouse://"+listener.Addr().String()+"?dial_timeout=2s")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	op, err := clickhouse.NewClickHouse(conn, &db.BaseInstance{BaseModel: db.BaseModel{ID: 1}})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	result := make(chan error, 1)
	go func() { _, e := op.DoSQLContext(ctx, "SELECT 1"); result <- e }()
	select {
	case <-queryStarted:
	case e := <-result:
		t.Fatalf("query failed before cancellation: %v", e)
	case <-time.After(time.Second):
		t.Fatal("query never reached peer")
	}
	cancel()
	select {
	case err = <-result:
	case <-time.After(time.Second):
		t.Fatal("native read did not cancel")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("native cause lost: %v", err)
	}
	select {
	case <-serverResult:
	case <-time.After(time.Second):
		t.Fatal("transport not closed")
	}
}
