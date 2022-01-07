package core

import (
	"github.com/gin-gonic/gin"
)

const (
	UserContextKey = "moauth/context/user"
)

type User struct {
	// 用户uid
	Uid int64 `protobuf:"varint,1,opt,name=uid,proto3" json:"uid,omitempty"`
	// 用户昵称，中文名
	Nickname string `protobuf:"bytes,2,opt,name=nickname,proto3" json:"nickname,omitempty"`
	// 用户名，拼音
	Username string `protobuf:"bytes,3,opt,name=username,proto3" json:"username,omitempty"`
	// 头像
	Avatar string `protobuf:"bytes,4,opt,name=avatar,proto3" json:"avatar,omitempty"`
	// 邮箱
	Email string `protobuf:"bytes,5,opt,name=email,proto3" json:"email,omitempty"`
}

// Uid 返回当前用户uid
func (c *Context) Uid() int {
	return Uid(c.Context)
}

// Uid 返回当前用户uid，入参使用gin.Context
func Uid(c *gin.Context) int {
	return int(ContextUser(c).Uid)
}

// ContextUser 从context取用户，入参使用gin.Context
func ContextUser(c *gin.Context) *User {
	resp := &User{}
	respI, flag := c.Get(UserContextKey)
	if flag {
		resp = respI.(*User)
	}
	return resp
}
