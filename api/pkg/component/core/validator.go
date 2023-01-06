package core

import (
	"errors"
	"reflect"
	"strings"
	"sync"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/locales/zh"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	tzh "github.com/go-playground/validator/v10/translations/zh"
	"github.com/gotomicro/ego/core/elog"
)

func init() {
	binding.Validator = &defaultValidator{}
}

type defaultValidator struct {
	once     sync.Once
	validate *validator.Validate
}

var _ binding.StructValidator = &defaultValidator{}

func (v *defaultValidator) ValidateStruct(obj interface{}) error {
	value := reflect.ValueOf(obj)
	valueType := value.Kind()
	if valueType == reflect.Ptr {
		valueType = value.Elem().Kind()
	}
	if valueType == reflect.Struct {
		v.lazyinit()
		if err := v.validate.Struct(obj); err != nil {
			return err
		}
	}
	return nil
}

func (v *defaultValidator) Engine() interface{} {
	v.lazyinit()
	return v.validate
}

func newValidator() *validator.Validate {
	// 注册translator
	zhTranslator := zh.New()
	uni := ut.New(zhTranslator, zhTranslator)
	trans, _ = uni.GetTranslator("zh")
	validate := validator.New()
	validate.RegisterTagNameFunc(func(field reflect.StructField) string {
		label := field.Tag.Get("label")
		if label == "" {
			return field.Name
		}
		return label
	})
	if err := tzh.RegisterDefaultTranslations(validate, trans); err != nil {
		elog.Fatal("Gin fail to registered Translation")
	}
	return validate
}

func (v *defaultValidator) lazyinit() {
	v.once.Do(func() {
		v.validate = newValidator()
		v.validate.SetTagName("binding")
	})
}

var trans ut.Translator

func validate(errs error) error {
	if validationErrors, ok := errs.(validator.ValidationErrors); ok {
		var errList []string
		for _, e := range validationErrors {
			errList = append(errList, e.Translate(trans))
		}
		return errors.New(strings.Join(errList, "|"))
	}
	return errs
}
