package view

import (
	"fmt"

	"gorm.io/gorm"
)

type Pagination struct {
	// Current 总记录数
	Current int `json:"current" form:"current"`
	// PageSize 每页记录数
	PageSize int `json:"pageSize" form:"pageSize"`
	// Total 总页数
	Total int64 `json:"total" form:"total"`
	// Sort 顺序
	Sort string `json:"sort"  form:"sort"`
}

const (
	DefaultPaginationSize = 20
)

func NewPagination(current int, pageSize int) *Pagination {
	p := &Pagination{}
	p.Current = current
	p.PageSize = pageSize
	if p.Current <= 0 {
		p.Current = 1
	}
	if p.PageSize <= 0 {
		p.PageSize = 20
	}
	return p
}

func (p *Pagination) Valid() error {
	if p.Current == 0 {
		p.Current = 1
	}
	if p.PageSize == 0 {
		p.PageSize = DefaultPaginationSize
	}

	if p.Current < 0 {
		return fmt.Errorf("current MUST be larger than 0")
	}

	if p.PageSize < 0 {
		return fmt.Errorf("invalid pageSize")
	}
	return nil
}

func (p *Pagination) List(db *gorm.DB, list interface{}) {
	if p.PageSize == 0 {
		p.PageSize = DefaultPaginationSize
	}
	if p.Current == 0 {
		p.Current = 1
	}
	if p.Sort == "" {
		p.Sort = "id desc"
	}
	db.Count(&p.Total)
	db.Order(p.Sort).Offset((p.Current - 1) * p.PageSize).Limit(p.PageSize).Find(list)
	return
}
