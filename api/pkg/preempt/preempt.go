package preempt

import (
	"context"
	"fmt"
	"time"

	"github.com/ego-component/eredis"
	"github.com/gotomicro/cetus/pkg/knet"
	"github.com/gotomicro/ego/core/elog"
)

const (
	_lock = "preempt:lock:%s" // uid -> clients

	retryInterval = time.Second * 30
	lockTime      = time.Minute * 3
)

func keyLock(key string) string {
	if key == "" {
		key = "default"
	}
	return fmt.Sprintf(_lock, key)
}

type Preempt struct {
	ctx       context.Context
	redis     *eredis.Component
	startFunc func()
	closeFunc func()
	key       string
	isOccupy  bool
	ip        string
}

func NewPreempt(ctx context.Context, db *eredis.Component, key string, startFunc, closeFunc func()) *Preempt {
	ipStr, _ := knet.Local()
	p := &Preempt{
		ctx:       ctx,
		redis:     db,
		startFunc: startFunc,
		closeFunc: closeFunc,
		isOccupy:  false,
		key:       keyLock(key),
		ip:        ipStr,
	}
	go p.sara()
	return p
}

func (p *Preempt) Close() {
	if !p.isOccupy {
		// not worker, do nothing
		return
	}
	p.closeFunc() // do closeFunc
	if p.isStillOnlyWorker() {
		p.unlock() // unlock the key
	}
}

func (p *Preempt) sara() {
	for {
		p.flows()
		time.Sleep(retryInterval)
	}
}

func (p *Preempt) flows() {
	if p.isOccupy {
		// func is processing, just renew the lock
		p.renew()
		elog.Info("preempt", elog.String("step", "renew"), elog.String("key", p.key))
		return
	}
	// try to grab the lock, to be the worker
	if p.lock() {
		// lock success, do func please
		elog.Info("preempt", elog.String("step", "startFunc"), elog.String("key", p.key))
		p.isOccupy = true
		go p.startFunc()
		return
	}
}

func (p *Preempt) renew() {
	_, err := p.redis.Client().Expire(p.ctx, p.key, lockTime).Result()
	if err != nil {
		elog.Error("preempt", elog.String("step", "renew"), elog.String("key", p.key), elog.String("error", err.Error()))
		return
	}
}

func (p *Preempt) isStillOnlyWorker() bool {
	// check redis key is set locally
	val, err := p.redis.Client().Get(p.ctx, p.key).Result()
	if err != nil {
		return false
	}
	if val == p.ip {
		return true
	}
	return false
}

func (p *Preempt) lock() bool {
	ok, err := p.redis.Client().SetNX(p.ctx, p.key, p.ip, lockTime).Result()
	if err != nil {
		elog.Error("preempt", elog.String("step", "lock"), elog.String("key", p.key), elog.String("error", err.Error()))
		return false
	}
	elog.Debug("preempt", elog.String("step", "SetNX"), elog.Any("ok", ok))
	if ok {
		// set success
		elog.Info("preempt", elog.String("step", "lockSucc"))
		return true
	}
	// set failed
	elog.Warn("preempt", elog.String("key", p.key), elog.String("step", "lockFailed"))
	return false
}

func (p *Preempt) unlock() {
	ok, err := p.redis.Client().Del(p.ctx, p.key).Result()
	if err != nil {
		elog.Error("preempt", elog.String("step", "unlock"), elog.String("key", p.key), elog.String("error", err.Error()))
		return
	}
	if ok == 0 {
		elog.Error("preempt", elog.String("key", p.key), elog.String("step", "deleteFailed"))
		return
	}
	elog.Info("preempt", elog.String("key", p.key), elog.String("step", "deleteSucc"))
}
