package core

import (
	"github.com/gin-gonic/gin"
)

const (
	UserContextKey = "moauth/context/user"
)

type User struct {
	Uid      int64  `protobuf:"varint,1,opt,name=uid,proto3" json:"uid,omitempty"`
	Nickname string `protobuf:"bytes,2,opt,name=nickname,proto3" json:"nickname,omitempty"`
	Username string `protobuf:"bytes,3,opt,name=username,proto3" json:"username,omitempty"`
	Avatar   string `protobuf:"bytes,4,opt,name=avatar,proto3" json:"avatar,omitempty"`
	Email    string `protobuf:"bytes,5,opt,name=email,proto3" json:"email,omitempty"`
}

// Uid gets uid from context
func (c *Context) Uid() int {
	return Uid(c.Context)
}

func (c *Context) User() *User {
	return ContextUser(c.Context)
}

// Uid get uid from gin.Context
func Uid(c *gin.Context) int {
	return int(ContextUser(c).Uid)
}

// ContextUser get user from gin.Context
func ContextUser(c *gin.Context) *User {
	resp := &User{}
	respI, flag := c.Get(UserContextKey)
	if flag {
		resp = respI.(*User)
	}
	return resp
}
