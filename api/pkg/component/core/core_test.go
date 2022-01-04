package core

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestBind(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/", bytes.NewBufferString(`{"title":"t", "email":"@shimo.im"}`))
	c.Request.Header.Add("Content-Type", gin.MIMEJSON)
	gc := Context{Context: c}
	var obj struct {
		Title string  `json:"title" binding:"required,max=32,min=4" label:"标题"`
		Email *string `json:"email" binding:"required,email" label:"邮箱"`
	}
	assert.Equal(t, gc.Bind(&obj).Error(), "标题长度必须至少为4个字符|邮箱必须是一个有效的邮箱")
	assert.Equal(t, w.Code, 400)
	t.Log("Code:", w.Code, "Body:", w.Body.String())
	assert.Empty(t, c.Errors)
}

func TestShouldBind(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/", bytes.NewBufferString(`{"title":"t", "email":"@shimo.im"}`))
	c.Request.Header.Add("Content-Type", gin.MIMEJSON)
	gc := Context{Context: c}
	var obj struct {
		Title string  `json:"title" binding:"required,max=32,min=4" label:"标题"`
		Email *string `json:"email" binding:"required,email" label:"邮箱"`
	}
	assert.Equal(t, gc.ShouldBind(&obj).Error(), "标题长度必须至少为4个字符|邮箱必须是一个有效的邮箱")
	assert.Equal(t, w.Code, 200)
	t.Log("Code:", w.Code, "Body:", w.Body.String())
	assert.Empty(t, c.Errors)
}
