package permission

import "github.com/clickvisual/clickvisual/api/pkg/model/db"

// PmsRuleController ...
type PmsRuleController interface {
	Create(data interface{}) error
	Update(data interface{}) error
	Delete(data interface{}) error
}

// defaultRoleController
type defaultRoleController struct {
}

// customRoleController
type customRoleController struct {
}

func (d defaultRoleController) Create(data interface{}) (err error) {
	panic("implement me")
}
func (d defaultRoleController) Update(data interface{}) (err error) {
	panic("implement me")
}
func (d defaultRoleController) Delete(data interface{}) (err error) {
	panic("implement me")
}

func (c customRoleController) Create(data interface{}) (err error) {
	panic("implement me")
}
func (c customRoleController) Update(data interface{}) (err error) {
	panic("implement me")
}
func (c customRoleController) Delete(data interface{}) (err error) {
	panic("implement me")
}

// PmsRuleControllerFactory: the interface of factory method
type PmsRuleControllerFactory interface {
	CreateController() PmsRuleController
}

// defaultRoleControllerFactory: the factory class of defaultRoleController
type defaultRoleControllerFactory struct {
}

// CreateController CreateController
func (d defaultRoleControllerFactory) CreateController() PmsRuleController {
	return defaultRoleController{}
}

// customRoleControllerFactory: the factory class of customRoleController
type customRoleControllerFactory struct {
}

// CreateController CreateController
func (c customRoleControllerFactory) CreateController() PmsRuleController {
	return customRoleController{}
}

// NewPmsRuleControllerFactory: Use a simple factory to encapsulate the factory method
func NewPmsRuleControllerFactory(roleType int) PmsRuleControllerFactory {
	switch roleType {
	case db.PmsRoleTypeDefault:
		return defaultRoleControllerFactory{}
	case db.PmsRoleTypeCustom:
		return customRoleControllerFactory{}
	}
	return nil
}
